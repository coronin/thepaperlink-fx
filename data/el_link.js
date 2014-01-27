// el_link.js - thepaperlink-fx
// author: Liang Cai, 2012

var DEBUG = false,
  page_d = document;

function $(d) { return page_d.getElementById(d); }

self.on('message', function(msg) {
  DEBUG && console.log(msg);
  if (msg[0] === 'el_data') {
    try {
      if (msg[2] === 1) {
        $(msg[1]).textContent = 'trying';
      } else if (msg[2] === '://') {
        $(msg[1]).style.cssText = 'display:none !important';
      } else {
        $(msg[1]).textContent = 'file link';
        $(msg[1]).onclick = function () {
          //$(this).attr('target', '_blank');
          window.open(msg[2]);
          return false;
        };
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
  } else if (msg[0] === 'g_scholar') {
    try {
      if (msg[2] === 1 && msg[3] === 1) {
        $('citedBy' + msg[1]).textContent = 'trying';
      } else if (msg[2] === 0 && msg[3] === 0) {
        $('citedBy' + msg[1]).textContent = 'Really? No one cited it yet. Is it a very recent publication?';
      } else if (msg[2] && msg[3]) {
        $('citedBy' + msg[1]).textContent = 'Cited by: '
          + msg[2] + ' times (in Google Scholar)';
        $('citedBy' + msg[1]).onclick = function () {
          //$(this).attr('target', '_blank');
          window.open('http://scholar.google.com' + msg[3]);
          return false;
        };
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
  }
});