#!/usr/bin/env node

var request = require('request')
var url = require('url')
var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')

if (!process.argv[2]) {
  console.error('Usage: download-m3u8 [url]')
  process.exit(1)
}

crawl(process.argv[2], function (err) {
  if (err) throw err
})

function crawl (url, cb) {
  visit({url: url, playlist: true}, cb)

  function visit (opts, cb) {
    requestAndWrite(opts.url, function (err, body) {
      if (err) return cb(err)
      if (!opts.playlist) return cb(null)

      var res = parseURLs(body, opts.url)
      var pending = 5
      var error = null

      loop(null)
      loop(null)
      loop(null)
      loop(null)
      loop(null)

      function loop (err) {
        if (err) error = err
        if (res.length) return visit(res.shift(), loop)
        if (!--pending) cb(error)
      }
    })
  }
}

function requestAndWrite (url, cb) {
  var filename = parseFilename(url)

  console.log(url + ' --> ' + filename)

  fs.readFile(filename, function (_, body) {
    if (body) return cb(null, body)
    mkdirp(path.dirname(filename), function (err) {
      if (err) return cb(err)
      request(url, {encoding: null, jar: true}, function (err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) return cb(new Error('Bad status: ' + res.statusCode))
        fs.writeFile(filename + '.tmp', body, function (err) {
          if (err) return cb(err)
          fs.rename(filename + '.tmp', filename, function (err) {
            if (err) return cb(err)
            cb(null, body)
          })
        })
      })
    })
  })
}

function parseFilename (u) {
  return u.split('/').slice(2).join('/').split('?')[0]
}

function parseURLs (body, baseUrl) {
  return body.toString().trim().split('\n')
    .map(function (line) {
      line = line.trim()
      if (line[0] === '#') return (line.match(/URI="([^"]+)"/) || [])[1]
      return line
    })
    .filter(function (line) {
      return line
    })
    .map(function (u) {
      return {
        playlist: /\.m3u8$/.test(u.split('?')[0]),
        name: u,
        url: url.resolve(baseUrl, u)
      }
    })
}
