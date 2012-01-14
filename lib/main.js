// main.js - thepaperlink-fx
// author: Liang Cai, 2012

var contextMenu = require('context-menu');
var menus = [];
var addon = require('self').data;
var tabs = require('tabs');
var pageMod = require('page-mod');
var workers = [];
var sStore = require('simple-storage').storage;
var req = require('request').Request;
var prefSet = require('simple-prefs');
var XMLHttpRequest = require('xhr').XMLHttpRequest;
//var panel = require('panel');
var ENTREZAJAX_APIKEY = '68ed3a6f270926237eaeeb2f7b2a7f27';
var NO_DEBUG = true;

function reload_about_us() {
  for each (var tab in tabs) {
    if (tab.url === 'http://www.thepaperlink.com/static/about_us.html')
      tab.reload();
  }
}

function open_tab_with_url(url) {
  if (rev_proxy) {
    tabs.open('http://www.thepaperlink.com' + url);
  } else {
    tabs.open('http://www.thepaperlink.net' + url);
  }
}

function detachWorker(worker, workerArray) {
  var i = workerArray.indexOf(worker);
  if(i !== -1) {
    workerArray.splice(i, 1);
    NO_DEBUG || console.log('worker detached');
  } else {
    NO_DEBUG || console.log('worker remains');
  }
}

function update_cloud_op() {
  var oauth_status = prefSet.prefs.oauth_status || '';
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
  NO_DEBUG || console.log('cloud_op: ' + cloud_op);
}

function rev_proxy_check() {
  req({
    url: 'https://pubget-hrd.appspot.com/static/humans.txt',
    onComplete: function (response) {
      if (response.status !== 200) {
        base_uri = 'http://0.pl4.me';
        rev_proxy = true;
        NO_DEBUG || console.log(response.status + ', you are accessing the reverse proxied server, which is slower.');
      } else {
        NO_DEBUG || console.log('Hi, you are accessing our secured server. Speedy!');
      }
    }
  }).get();
}

function save_visited_ID(new_id) {
  if (sStore.id_found === undefined) {
    sStore.id_found = new_id;
  } else if (sStore.id_found.indexOf(new_id) === -1) {
    sStore.id_found += ' ' + new_id;
  }
  NO_DEBUG || console.log(sStore.id_found);
  if (sStore.id_found.split(' ').length > 12) {
    saveIt_pubmeder( sStore.id_found.replace(/\s+/g, ',') );
  }
}

function saveIt_pubmeder(pmid) {
  if (pubmeder_apikey === null || pubmeder_apikey === null) {
    NO_DEBUG || console.log('no valid pubmeder credit, open related URL');
    if (prefSet.prefs.tab_open_if_no_apikey) {
      tabs.open('http://www.pubmeder.com/registration');
    }
    return;
  }
  var url = 'https://pubmeder-hrd.appspot.com';
  if (rev_proxy) {
    url = 'http://1.pl4.me';
  }
  url += '/input?apikey=' + pubmeder_apikey + '&email=' + pubmeder_email + '&pmid=' + pmid;
  req({
    url: url,
    onComplete: function (response) {
      var d = response.json;
      if (d && d.respond > 1) {
        NO_DEBUG || console.log('all sent to www.pubmeder.com');
        if (sStore.id_history === undefined) {
          sStore.id_history = pmid;
        } else {
          sStore.id_history += ',' + pmid;
          NO_DEBUG || console.log(sStore.id_history);
        }
        sStore.id_found = '';
      }
    }
  }).get();
}

function update_ezproxy_prefix(p) {
  if (p && p !== 'http://a.b.c/d?url='
    && (p.substr(0,7) === 'http://' || p.substr(0,8) === 'https://')) {
    ezproxy_prefix = p;
  } else {
    ezproxy_prefix = '';
    prefSet.prefs.ezproxy_prefix = 'http://a.b.c/d?url=';
    if (p !== 'http://a.b.c/d?url=') {
      NO_DEBUG || console.log('Not a valid ezproxy_prefix value, use ""');
    }
  }
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
        NO_DEBUG || console.log('eSearch:\n' + response.text);
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
          NO_DEBUG || console.log('pdf upload failed, but email sent');
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
  apikey = sStore.thepaperlink_apikey || null,
  pubmeder_apikey = sStore.pubmeder_apikey || null,
  pubmeder_email = sStore.pubmeder_email || null,
  pubmeder_ok = false,
  cloud_op = '',
  ezproxy_prefix = prefSet.prefs.ezproxy_prefix || '',
  no_context_menu = prefSet.prefs.no_context_menu || false,
  rev_proxy = false;

// check which server to use
rev_proxy || rev_proxy_check();
// generate string for enabled external services
update_cloud_op();
// check pubmeder status
if (pubmeder_apikey && pubmeder_email) { pubmeder_ok = true; }
// fix ezproxy
update_ezproxy_prefix(ezproxy_prefix);
// fetch apikey
if ( prefSet.prefs.tab_open_if_no_apikey ) {
  if (!pubmeder_ok) {
    tabs.open('http://www.pubmeder.com/registration');
  }
  if (!apikey) {
    tabs.open('http://www.thepaperlink.com/reg');
  }
} else {
  if (!pubmeder_ok || !apikey) {
    tabs.open('http://www.thepaperlink.com/static/about_us.html');
  }
}


exports.main = function(options, callbacks) {
  NO_DEBUG || console.log(options.loadReason);

  var menu_a = no_context_menu || contextMenu.Item({
    label: 'search the_Paper_Link',
    image: addon.url('p_16x16.png'),
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("context", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  if (text.length > 14)' +
                   '    text = text.substr(0, 14) + "...";' +
                   '  return "search \'" + text + "\' on the_Paper_Link";' +
                   '});' +
                   'self.on("click", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  self.postMessage(text);' +
                   '});',
    onMessage: function (item) {
      NO_DEBUG || console.log('seaching with "' + item + '"');
      open_tab_with_url('/?q=' + item);
    }
  });
  if (no_context_menu !== true) { menus.push(menu_a); }

  var menu_b = no_context_menu || contextMenu.Item({
    label: 'visit the_Paper_Link',
    image: addon.url('p_16x16.png'),
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  self.postMessage("/");' +
                   '});',
    onMessage: function (item) {
      NO_DEBUG || console.log('visiting our server ' + item);
      open_tab_with_url(item);
    }
  });
  if (no_context_menu !== true) { menus.push(menu_b); }

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
  if (no_context_menu !== true) { menus.push(menu_c); }

  var inject_a = pageMod.PageMod({
    include: [
      'http://www.ncbi.nlm.nih.gov/pubmed*',
      'https://www.ncbi.nlm.nih.gov/pubmed*',
      'http://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*',
      'https://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*'
      ],
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('info_bar.js'),
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script for pubmed pages');
      worker.postMessage(['init', base_uri, apikey,
        pubmeder_ok, pubmeder_apikey, pubmeder_email,
        cloud_op, ezproxy_prefix, addon.url('loadingLine.gif') ]);
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
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
                  worker.postMessage(['except', 1]);
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
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var apikey = d.getElementById("apikey").innerHTML;' +
                   'var cloud_op = d.getElementById("cloud_op").innerHTML;' +
                   'var nod = d.getElementById("client_modify_it");' +
                   'if (nod) {' +
                   '  nod.innerHTML = "your Firefox is all set for that";' +
                   '}' +
                   'self.postMessage([apikey, cloud_op]);',
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script for thepaperlink');
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
        apikey = msg[0];
        sStore.thepaperlink_apikey = msg[0];
        prefSet.prefs.oauth_status = msg[1];
        update_cloud_op();
        reload_about_us();
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
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var email = d.getElementById("currentUser").innerHTML;' +
                   'var apikey = d.getElementById("apikey_pubmeder").innerHTML;' +
                   'self.postMessage([email, apikey]);',
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script for pubmeder');
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
        pubmeder_email = msg[0];
        sStore.pubmeder_email = msg[0];
        pubmeder_apikey = msg[1];
        sStore.pubmeder_apikey = msg[1];
        pubmeder_ok = true;
        reload_about_us();
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_d = pageMod.PageMod({
    include: 'http://www.thepaperlink.com/oauth/*',
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var content = d.getElementById("r_content").innerHTML;' +
                   'var service = d.getElementById("r_success").innerHTML;' +
                   'self.postMessage([service, content]);',
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script for thepaperlink-oauth');
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
        if (msg[0]) {
          var reload_var = 0;
          if (prefSet.prefs.oauth_status === undefined) {
            prefSet.prefs.oauth_status = msg[0];
            reload_var = 1;
          } else if (prefSet.prefs.oauth_status.indexOf(msg[0]) === -1) {
            prefSet.prefs.oauth_status += ' ' + msg[0];
            reload_var = 1;
          }
          if (reload_var) {
            update_cloud_op();
            reload_about_us();
          }
        }
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });

  var inject_e = pageMod.PageMod({
    include: '*',
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('find_id.js'),
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script to found an ID');
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
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

  var inject_f = pageMod.PageMod({
    include: 'http://www.thepaperlink.com/static/about_us.html',
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('format_page.js'),
    onAttach: function onAttach(worker) {
      NO_DEBUG || console.log('attaching content script to instruction');
      worker.postMessage([
        apikey,
        pubmeder_ok,
        cloud_op,
        prefSet.prefs.tab_open_if_no_apikey,
        prefSet.prefs.no_context_menu,
        prefSet.prefs.rev_proxy,
        prefSet.prefs.ezproxy_prefix,
        addon.url('p_128x128.png')
      ]);
      workers.push(worker);
      worker.on('message', function(msg) {
        NO_DEBUG || console.log(msg);
        if (msg === 'check_apikey') {
          prefSet.prefs.tab_open_if_no_apikey = true;
          reload_about_us();
        } else if (msg === 'activate_context_menu') {
          prefSet.prefs.no_context_menu = false;
          reload_about_us();
        }
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });
};


prefSet.on('ezproxy_prefix', function () {
  update_ezproxy_prefix(prefSet.prefs.ezproxy_prefix);
});

prefSet.on('no_context_menu', function () {
  if ( prefSet.prefs.no_context_menu ) {
    no_context_menu = true;
    NO_DEBUG || console.log('Will not shown any contextual menu');
    var i;
    for (i = 0; i < menus.length; i += 1) {
      menus[i].destroy();
    }
  } else {
    NO_DEBUG || console.log('Restart to show the contextual menu');
  }
});

prefSet.on('rev_proxy', function () {
  if ( prefSet.prefs.rev_proxy ) {
    rev_proxy = true;
    NO_DEBUG || console.log('Will use the reverse proxied server');
  } else {
    rev_proxy = false;
    NO_DEBUG || console.log('Will use the secured server');
  }
});