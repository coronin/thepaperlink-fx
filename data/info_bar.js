var base_uri, apikey,
  pubmeder_ok, pubmeder_apikey, pubmeder_email,
  cloud_op, ezproxy_prefix,
  loading_gif, swf_file;

var pmids = '',
  pmidArray = [],
  old_title = '',
  title_pos = 0,
  search_term = '',
  onePage_calls = 0,
  alert_js = 'function alert_dev(apikey) {' +
'  if (apikey && apikey !== "G0oasfw0382Wd3oQ0l1LiWzE") {' +
'   var oXHR = new XMLHttpRequest();' +
'   oXHR.open("POST", "http://0.pl4.me/?action=alert_dev&pmid=1&apikey=" + apikey, true);' +
'   oXHR.onreadystatechange = function (oEvent) {' +
'     if (oXHR.readyState === 4) {' +
'       if (oXHR.status === 200) {' +
'         console.log(oXHR.responseText);' +
'       } else {' +
'         console.log("Error", oXHR.statusText);' +
'     } }' +
'   };' +
'   oXHR.send(null);' +
'  } else {' +
'    alert("You have to be a registered user to be able to alert the developer.");' +
'  }' +
'}';

function t(n) { return document.getElementsByTagName(n); }

function $(d) { return document.getElementById(d); }

function trim(s) { return ( s || '' ).replace( /^\s+|\s+$/g, '' ); }

function parse_id(a) { // pubmeder code
  var regpmid = /pmid\s*:?\s*(\d+)\s*/i, 
    regdoi = /doi\s*:?\s*/i,
    doipattern = /(\d{2}\.\d{4}\/[a-zA-Z0-9\.\/\)\(-]+\w)\s*\W?/,
    regpmc = /pmcid\s*:?\s*(PMC\d+)\s*/i,
    ID = null;
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
  } else if (regpmc.test(a)) {
    ID = regpmc.exec(a);
    ID[1] = ID[1].toUpperCase();
  } else if (regdoi.test(a) || doipattern.test(a)) {
    ID = doipattern.exec(a);
  }
  return ID;
}

function getPmid(zone, num) {
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, content, tmp, temp;
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num + 1].className === 'rprtnum') {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      } else {
        t(zone)[num - 2].setAttribute('id', ID[1]);
      }
      if (t(zone)[num].className === 'rprt') {
        b = document.createElement('div');
        content = t(zone)[num + 2].textContent; // fx does not support innerText
        tmp = content.split(' [PubMed - ')[0].split('.');
        content = trim(tmp[0]) +
          '.\r\n' + trim(tmp[1]) +
          '.\r\n' + trim(tmp[2]) +
          '. ' + trim(tmp[3]);
        temp = trim(tmp[tmp.length - 1]);
        if (temp.indexOf('[Epub ahead of print]') > -1) {
          content += '. [' + temp.substr(22) + ']\r\n';
        } else { content += '. [' + temp + ']\r\n'; }
        b.innerHTML = '<div style="float:right;z-index:1"><embed src="' + swf_file + '" wmode="transparent" width="110" height="14" quality="high" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" FlashVars="text=' + content + '" /></div>';
        t(zone)[num + 3].appendChild(b);
      }
      pmids += ',' + ID[1];
    }
  }
}

function get_Json(pmids) {
  var i, div,
    need_insert = 1,
    url = '/api?flash=yes&a=fx1&pmid=' + pmids,
    loading_span = '<span style="font-weight:normal;font-style:italic"> fetching data from "the Paper Link"</span>&nbsp;&nbsp;<img src="' + loading_gif + '" width="16" height="11" alt="loading" />';
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0; i < t('h2').length; i += 1) {
    if (t('h2')[i].className === 'result_count') {
      old_title = t('h2')[i].innerHTML;
      title_pos = i;
      need_insert = 0;
      t('h2')[i].innerHTML = old_title + loading_span;
    }
  }
  if (need_insert) {
    div = document.createElement('h2');
    div.innerHTML = loading_span;
    $('messagearea').appendChild(div);
  }
  onePage_calls += 1;
  self.postMessage( ['url', url] );
}

function run() {
  var i, z;
  try {
    search_term = $('search_term').value;
  } catch (err) {
    console.log(err);
  }
  for (i = 0; i < t('div').length; i += 1) {
    if (t('div')[i].className === 'rprt' || t('div')[i].className === 'rprt abstract') { //  && t('div')[i].className !== 'abstract'
      getPmid('div', i);
    } else if (!search_term && t('div')[i].className === 'print_term') {
      z = t('div')[i].textContent;
      if (z) {
        search_term = z.substr(8, z.length);
      }
    }
  }
  pmids = pmids.substr(1, pmids.length);
  pmidArray = pmids.split(',');
  if (pmids) {
    localStorage.setItem('thePaperLink_ID', pmidArray[0]);
    get_Json(pmids);
  }
}










self.on('message', function(msg) {
  if (msg[0] === 'init') {
    base_uri = msg[1];
    apikey = msg[2];
    pubmeder_ok = msg[3];
    pubmeder_apikey = msg[4];
    pubmeder_email = msg[5];
    cloud_op = msg[6];
    ezproxy_prefix = msg[7];
    loading_gif = msg[8];
    swf_file = msg[9];
    run();
  }
});