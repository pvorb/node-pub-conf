;(function () {

var fs = require('fs');
var path = require('path');
var readline = require('readline');

var props = require('props');
var Index = require('Index');
var isodate = require('isodate');

var cliPrefix = '> ';
var confdir = __dirname;
var root = path.resolve(confdir, '..');

var ext = {
  html: /\.(html|htm|xhtml)$/,
  markdown: /\.(md|mkd|markdown|text|txt)$/,
  image: /\.(jpe?g|png|gif|bmp|svg|webp)$/
};

module.exports = function (files, opt) {
  // Load configuration file
  var conf = fs.readFileSync(path.resolve(confdir, 'conf.json'), 'utf8');
  conf = JSON.parse(conf);

  if (files.length > 1)
    return console.err('pub add only supports one file at once.');

  new Index(conf, function (err, index) {
    if (err)
      throw err;

    var f = files.pop();
    // If it's html or a picture, ask for user input
    if (f.match(ext.html) || f.match(ext.image))
      askForInfo(index, f, makeIndexes);
    // If it's markdown, parse file with props
    else if (f.match(ext.markdown)) {
      var info = props(fs.readFileSync(f));
      makeIndexes(index, f, info);
    }
    // Otherwise the file type is not supported
    else
      console.err('File type not supported');
  });
};

function askForInfo(index, file, cb) {
  var info = {};

  var rl =readline.createInterface(process.stdin, process.stdout);
  rl.on('close', function (l) {
    console.log('Aborting...');
    process.exit(0);
  }).on('line', function (l) {
    l = l.trim();
    var prop = l.split(':');
    if (prop.length > 2) {
      var key = prop.shift().trim();
      var value = prop.join(':');

      switch (key) {
        case 'created':
        case 'modified':
          info[key] = isodate(value);
          break;
       default:
          info[key] = value;
      }
    } else
      if (l == '.') {
        rl.close();
        console.log(info);
        info.__content = fs.readFileSync(file, 'utf8');
        cb(index, file, info);
      } else
        console.warn('Unknown command');
  });

  console.log('This file type does not contain all necessary information\n'
    + 'Please provide me some additional information.');
  rl.setPrompt(cliPrefix, cliPrefix.length);
  rl.prompt();
}

function makeIndexes(index, file, info) {
  if (!info._id)
    var dest = file.replace(ext.markdown, '.html').replace(ext.image, '.html');
    info._id = dest.replace(new RegExp('^'+root), '');

  // add file to index
  index.add(info, function (err) {
    if (err)
      throw err;
    console.log('Added '+file);

    // write indexes
    index.write(function (err) {
      if (err)
        console.err(err);
      else
        console.log('Wrote index files.');
    });

    // write tags
    index.writeTags(function (err) {
      if (err)
        console.err(err);
      else
        console.log('Wrote tag files.');
    });
  });
}

}).call(this);
