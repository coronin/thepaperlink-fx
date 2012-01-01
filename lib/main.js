// Import the APIs

var contextMenu = require('context-menu');
var addon = require('self').data;
var tabs = require('tabs');
var pageMod = require('page-mod');
var workers = [];
var ss = require('simple-storage').storage;
var req = require('request').Request;
//var panel = require('panel');
var ENTREZAJAX_APIKEY = '68ed3a6f270926237eaeeb2f7b2a7f27';

function open_tab_with_url(url) {
  tabs.open(base_uri + url);
}

function detachWorker(worker, workerArray) {
  var i = workerArray.indexOf(worker);
  if(i !== -1) {
    workerArray.splice(i, 1);
    console.log('worker detached');
  } else {
    console.log('worker remains');
  }
}

function update_cloud_op() {
  var oauth_status = ss.oauth_status || '';
  cloud_op = '';
  if (oauth_status.indexOf('mendeley') > -1) {
    cloud_op += 'm';
  }
  if (oauth_status.indexOf('facebook') > -1) {
    cloud_op += 'f';
  }
  if (oauth_status.indexOf('dropbox') > -1) {
    cloud_op += 'd';
  }
  if (oauth_status.indexOf('douban') > -1) {
    cloud_op += 'b';
  }
  console.log('cloud_op: ' + cloud_op);
}

function rev_proxy_check() {
  req({
    url: 'https://pubget-hrd.appspot.com/static/humans.txt',
    onComplete: function (response) {
      if (response.status !== 200) {
        base_uri = 'http://0.pl4.me';
        rev_proxy = 1;
        console.log(response.status + ', you are accessing the reverse proxied server, which is slower.');
      } else {
        console.log('Hi, you are accessing our secured server. Speedy!');
      }
    }
  }).get();
}

function save_visited_ID(new_id) {
  if (ss.id_found === undefined) {
    ss.id_found = new_id;
  } else if (ss.id_found && ss.id_found.indexOf(new_id) === -1) {
    ss.id_found += ' ' + new_id;
  }
  console.log(ss.id_found);
}

function eSearch(search_term) {
  var url = 'https://entrezajax2.appspot.com';
  if (rev_proxy) {
    url = 'http://4.pl4.me';
  }
  url += '/esearch?apikey=' + ENTREZAJAX_APIKEY + '&db=pubmed&term=' + search_term;
  req({
    url: url,
    onComplete: function (response) {
      if (response.json && response.json.result.IdList.length === 1) {
        save_visited_ID( response.json.result.IdList[0] );
      } else {
        console.log('eSearch:\n' + response.text);
      }
    }
  }).get();
}

function upload_pdf_as_binary(upload_url, pdf, pmid, apikey, no_email) {
  var pdf_data = getBinary(pdf), msg, base_uri;
  msg = sendBinary(upload_url, pdf_data, pmid);
  if (msg === null) {
    if (!no_email) {
      req({
        url: base_uri + '/',
        content : {'pmid': pmid, 'apikey': apikey, 'action': 'email'},
        onComplete: function (response) {
          console.log('pdf upload failed, but email sent');
        }
      }).post();
  } }
}


// below, direct copy from Chrome

function getBinary(file) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', file, false);
  if (xhr.hasOwnProperty('responseType')) {
    xhr.responseType = 'arraybuffer';
  } else {
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
  }
  xhr.send(null);
  var responseArrayBuffer = xhr.hasOwnProperty('responseType') && xhr.responseType === 'arraybuffer',
    mozResponseArrayBuffer = 'mozResponseArrayBuffer' in xhr,
    bin_data = mozResponseArrayBuffer ? xhr.mozResponseArrayBuffer : responseArrayBuffer ? xhr.response : xhr.responseText;
  return bin_data;
}

function sendBinary(url, data, pmid) {
  try {
    var xhr = new XMLHttpRequest(),
      boundary = 'AJAX------------------------AJAX',
      contentType = "multipart/form-data; boundary=" + boundary,
      postHead = '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n',
      postTail = '\r\n--' + boundary + '--',
      tmp = '',
      abView,
      i;
    if (data instanceof ArrayBuffer) {
      console.log('ArrayBuffer, need View, assume Uint8Array');
      abView = new Uint8Array(data);
      if (abView.length < 1000) {
        return null;
      }
      console.log(abView.length);
      for (i = 0; i < abView.length; i += 1) {
        tmp += String.fromCharCode(abView[i] & 0xff);
      }
      data = postHead + tmp + postTail;
    } else {
      data = postHead + tmp + postTail;
    }
    if (typeof XMLHttpRequest.prototype.sendAsBinary === 'function') {
      console.log('built-in support sendAsBinary');
    } else {
      console.log('define sendAsBinary');
      XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
        function byteValue(x) {
          return x.charCodeAt(0) & 0xff;
        }
        var ords = Array.prototype.map.call(datastr, byteValue);
        var ui8a = new Uint8Array(ords);
        this.send(ui8a.buffer);
      };
    }
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.sendAsBinary(data);
    return xhr.responseText;
  } catch (err) {
    return null;
  }
}

// -- Liang Cai, 2011 -- //


var base_uri = 'https://pubget-hrd.appspot.com',
  apikey = ss.apikey || null,
  pubmeder_apikey = ss.pubmeder_apikey || null,
  pubmeder_email = ss.pubmeder_email || null,
  pubmeder_ok = 0,
  cloud_op = '',
  ezproxy_prefix = ss.ezproxy_prefix || '',
  no_context_menu = ss.no_context_menu || 0,
  rev_proxy = 0;

rev_proxy_check();

if (pubmeder_apikey && pubmeder_email) { pubmeder_ok = 1; }

update_cloud_op();


exports.main = function(options, callbacks) {
  console.log(options.loadReason);

  var menu_a = no_context_menu || contextMenu.Item({
    label: 'search the Selection',
    image: addon.url('p_16x16.png'),
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("click", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  self.postMessage(text);' +
                   '});',
    onMessage: function (item) {
      console.log('seaching with "' + item + '"');
      open_tab_with_url('/?q=' + item);
    }
  });

  var menu_b = no_context_menu || contextMenu.Item({
    label: 'visit the_Paper_Link',
    image: addon.url('p_16x16.png'),
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  self.postMessage("");' +
                   '});',
    onMessage: function (item) {
      console.log('visiting our server');
      open_tab_with_url('/');
    }
  });

  var menu_c = no_context_menu || contextMenu.Item({
    label: 'find the ID on Page',
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  if (window.location.protocol === "https:") {' +
                   '    return; }' +
                   '  localStorage.setItem("thePaperLink_pubget_js_key", "' + apikey + '");' +
                   '  localStorage.setItem("thePaperLink_pubget_js_base", "' + base_uri + '/");' +
                   '  if(document.getElementById("__tr_display")){return;}var d=document,s=d.createElement("script");s.setAttribute("type","text/javascript");s.setAttribute("src","' +
                   base_uri + '/js?y="+(Math.random()));d.body.appendChild(s);' +
                   '});'
  });

  var inject_a = pageMod.PageMod({
    include: [
      'http://www.ncbi.nlm.nih.gov/pubmed*',
      'https://www.ncbi.nlm.nih.gov/pubmed*',
      'http://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*',
      'https://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*'
      ],
    contentScriptFile: addon.url('info_bar.js'),
    onAttach: function onAttach(worker) {
      console.log('attaching content script for pubmed pages');
      worker.postMessage(['init', base_uri, apikey,
        pubmeder_ok, pubmeder_apikey, pubmeder_email,
        cloud_op, ezproxy_prefix, addon.url('loadingLine.gif') ]);
      workers.push(worker);
      worker.on('message', function(msg) {
        console.log(msg);
        if (msg[0] === 'url') {
          var req_apikey = apikey || 'G0oasfw0382Wd3oQ0l1LiWzE'; // temp apikey, may disabled in the future
          if (msg[1]) {
            req({
              url: base_uri + msg[1] + req_apikey,
              onComplete: function (response) {
                var d = response.json;
                if (d && (d.count || d.error)) { // good or bad, both got json return
                  worker.postMessage(['tj', d]);
                } else {
                  worker.postMessage(['except', apikey]);
                }
              }
            }).get();
          } else {
            worker.postMessage(['wrong', 'No valid URL']);
          }

        } else if (msg[0] === 'upload_pdf') {
          upload_pdf_as_binary(msg[1], msg[2], msg[3], msg[4], msg[5]);

        }
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_b = pageMod.PageMod({
    include: [
      'http://thepaperlink.appspot.com/reg',
      'https://thepaperlink.appspot.com/reg',
      'http://pubget-hrd.appspot.com/reg',
      'https://pubget-hrd.appspot.com/reg',
      'http://www.thepaperlink.com/reg',
      'http://www.thepaperlink.net/reg',
      'http://0.pl4.me/reg'
      ],
    contentScriptWhen: 'end',
    contentScript: 'var apikey = document.getElementById("apikey").innerHTML;' +
                   'self.postMessage(apikey);',
    onAttach: function onAttach(worker) {
      console.log('attaching content script for thepaperlink');
      workers.push(worker);
      worker.on('message', function(msg) {
        console.log(msg);
        apikey = msg;
        ss.apikey = msg;
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_c = pageMod.PageMod({
    include: [
      'http://pubmeder.appspot.com/registration',
      'https://pubmeder.appspot.com/registration',
      'http://pubmeder-hrd.appspot.com/registration',
      'https://pubmeder-hrd.appspot.com/registration',
      'http://www.pubmeder.com/registration',
      'http://1.pl4.me/registration'
      ],
    contentScriptWhen: 'end',
    contentScript: 'var d = document;' +
                   'var email = d.getElementById("currentUser").innerHTML;' +
                   'var apikey = d.getElementById("apikey_pubmeder").innerHTML;' +
                   'self.postMessage([email, apikey]);',
    onAttach: function onAttach(worker) {
      console.log('attaching content script for pubmeder');
      workers.push(worker);
      worker.on('message', function(msg) {
        console.log(msg);
        pubmeder_email = msg[0];
        ss.pubmeder_email = msg[0];
        pubmeder_apikey = msg[1];
        ss.pubmeder_apikey = msg[1];
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_d = pageMod.PageMod({
    include: 'http://www.thepaperlink.com/oauth/*',
    contentScriptWhen: 'end',
    contentScript: 'var d = document;' +
                   'var content = d.getElementById("r_content").innerHTML;' +
                   'var service = d.getElementById("r_success").innerHTML;' +
                   'self.postMessage([service, content]);',
    onAttach: function onAttach(worker) {
      console.log('attaching content script for thepaperlink-oauth');
      workers.push(worker);
      worker.on('message', function(msg) {
        console.log(msg);
        if (msg[0]) {
          if (ss.oauth_status === undefined) {
            ss.oauth_status = msg[0];
          } else if (ss.oauth_status.indexOf(msg[0]) === -1) {
            ss.oauth_status += ' ' + msg[0];
          }
          update_cloud_op();
        }
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_e = pageMod.PageMod({
    include: '*',
    contentScriptWhen: 'end',
    contentScriptFile: addon.url('find_id.js'),
    onAttach: function onAttach(worker) {
      console.log('attaching content script to found an ID');
      workers.push(worker);
      worker.on('message', function(msg) {
        console.log(msg);
        if (msg[0] === 'foundID') {
          var dotCheck = /\./,
            pmcCheck = /PMC/;
          if (dotCheck.test(msg[1]) || pmcCheck.test(msg[1])) {
            eSearch( msg[1] );
          } else {
            save_visited_ID( msg[1] );
          }
        }
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });
};