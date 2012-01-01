var base_uri, apikey,
  pubmeder_ok, pubmeder_apikey, pubmeder_email,
  cloud_op, ezproxy_prefix,
  loading_gif;

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

function getPmid(zone, num) {
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, content, tmp, temp,
    swf_file = 'http://9.pl4.me/clippy.swf'; // need flash
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
    loading_span = '<span style="font-weight:normal;font-style:italic"> fetching data from "the Paper Link"</span>&nbsp;&nbsp;<img src="' + loading_gif +
      '" width="16" height="11" alt="loading" />';
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
  self.postMessage(['url', url]);
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
    run();

  } else if (msg[0] === 'tj') {
    var div, i, j, k, S, styles, peaks,
      r = msg[1],
      bookmark_div = '<div id="css_loaded"></div>';
    var doc = document;
    if (r.error) {
      t('h2')[title_pos].innerHTML = old_title + ' <span style="font-size:14px;font-weight:normal;color:red">"the Paper Link" error : ' + r.error + '</span>';
      return;
    }
    if (!$('paperlink2_display')) {
      peaks = doc.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      peaks.setAttribute('src', base_uri + '/jss?y=' + (Math.random()));
      doc.body.appendChild(peaks);
    }
    styles = '.thepaperlink {'
      + '  background: #e0ecf1;'
      + '  border:2px solid #dedede; border-top:2px solid #eee; border-left:2px solid #eee;'
      + '  padding: 2px 4px;'
      + '  border-radius: 4px;'
      + '  display: inline-block'
      + '}'
      + '.thepaperlink > a ,'
      + '.thepaperlink > span {'
      + '  margin: 0 6px'
      + '}'
      + 'a.thepaperlink-green {'
      + '  color: green'
      + '}'
      + 'a.thepaperlink-red {'
      + '  color: red'
      + '}'
      + '.thepaperlink-home {'
      + '  color: grey;'
      + '  text-decoration: none;'
      + '  cursor: pointer'
      + '}';
    if (pubmeder_ok) {
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal;cursor:pointer"><span id="thepaperlink_saveAll" onclick="saveIt_pubmeder(\'' + pmids + '\',\'' + pubmeder_apikey + '\',\'' + pubmeder_email + '\')">pubmeder&nbsp;all</span></div>';
    }
    if (!$('css_loaded')) {
      S = doc.createElement('style');
      S.type = 'text/css';
      S.appendChild(document.createTextNode(styles));
      doc.body.appendChild(S);
      //GM_addStyle(styles);
    }
    if (pubmeder_ok && old_title) {
      t('h2')[title_pos].innerHTML = old_title + bookmark_div;
    } else {
      t('h2')[title_pos].innerHTML = old_title;
    }
    for (i = 0; i < r.count; i += 1) {
      div = doc.createElement('div');
      div.className = 'thepaperlink';
      div.innerHTML = '<a class="thepaperlink-home" href="' + base_uri +
        '/?q=pmid:' + r.item[i].pmid + '" target="_blank">the Paper Link</a>: ';
      if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
        div.innerHTML += '<span>impact&nbsp;' + r.item[i].slfo + '</span>';
      }
      if (r.item[i].pdf) {
        div.innerHTML += '<a id="thepaperlink_pdf' + r.item[i].pmid +
          '" class="thepaperlink-green" href="' + ezproxy_prefix + r.item[i].pdf +
          '" target="_blank">direct&nbsp;pdf</a>';
      }
      if (r.item[i].pmcid) {
        div.innerHTML += '<a id="thepaperlink_pmc' + r.item[i].pmid +
          '" href="https://www.ncbi.nlm.nih.gov/pmc/articles/' +
          r.item[i].pmcid + '/?tool=thepaperlinkClient" target="_blank">open&nbsp;access</a>';
      }
      if (r.item[i].doi) {
        div.innerHTML += '<a id="thepaperlink_doi' + r.item[i].pmid +
          '" href="' + ezproxy_prefix + 'http://dx.doi.org/' + r.item[i].doi + '" target="_blank">publisher</a>';
      } else if (r.item[i].pii) {
        div.innerHTML += '<a id="thepaperlink_doi' + r.item[i].pmid +
          '" href="' + ezproxy_prefix + 'http://linkinghub.elsevier.com/retrieve/pii/' + r.item[i].pii + '" target="_blank">publisher</a>';
      }
      if (r.item[i].f_v && r.item[i].fid) {
        div.innerHTML += '<a id="thepaperlink_f' + r.item[i].pmid +
          '" class="thepaperlink-red" href="' + ezproxy_prefix + 'http://f1000.com/' + r.item[i].fid +
          '" target="_blank">f1000&nbsp;score&nbsp;' + r.item[i].f_v + '</a>';
      }
      if (pubmeder_ok || cloud_op) {
        div.innerHTML += '<span id="thepaperlink_save' + r.item[i].pmid +
          '" class="thepaperlink-home" onclick="saveIt(\'' + r.item[i].pmid +
          '\',\'' + save_key + '\',\'' + save_email + '\',\'' +
          apikey + '\',\'' + cloud_op + '\')">save&nbsp;it</span>';
      }
      if (apikey) {
        div.innerHTML += '<span id="thepaperlink_rpt' + r.item[i].pmid +
          '" class="thepaperlink-home" onclick="show_me_the_money(\'' +
          r.item[i].pmid + '\',\'' + apikey + '\')">&hellip;</span>';
      }
      if (apikey && r.item[i].pdf) {
        div.innerHTML += '<span style="display:none !important;" id="thepaperlink_hidden' + r.item[i].pmid + '"></span>';
      }
      $(r.item[i].pmid).appendChild(div);


      if ($('thepaperlink_hidden' + r.item[i].pmid)) {
        $('thepaperlink_hidden' + r.item[i].pmid).addEventListener('email_pdf', function () {
          var eventData = this.innerText,
            pmid = this.id.substr(19),
            pdf = $('thepaperlink_pdf' + pmid).href,
            no_email_span = $('thepaperlink_save' + pmid).className;
          if ( (' ' + no_email_span + ' ').indexOf(' no_email ') > -1 ) {
            self.postMessage(['upload_pdf', eventData, pdf, pmid, apikey, 1]);
          } else {
            self.postMessage(['upload_pdf', eventData, pdf, pmid, apikey, 0]);
            try {
              $('thepaperlink_D' + pmid).setAttribute('style', 'display:none');
            } catch (err) {
              console.log(err);
            }
          }
        });
      }


      k = pmidArray.length;
      for (j = 0; j < k; j += 1) {
        if (r.item[i].pmid === pmidArray[j]) {
          pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
      } }
    }
    if (pmidArray.length > 0) {
      if (pmidArray.length === k) {
        console.log('getting nothing, failed on ' + k);
      } else {
        console.log('call for ' + k + ', not get ' + pmidArray.length);
        t('h2')[title_pos].innerHTML = old_title + bookmark_div + '&nbsp;&nbsp;<img src="' + loading_gif +
          '" width="16" height="11" alt="loading" />';
        onePage_calls += 1;
        self.postMessage(['url', '/api?a=safari2&pmid=' + pmidArray.join(',') + '&apikey=']);
      }
    }
    console.log('onePage_calls: ' + onePage_calls);

  } else if (msg[0] === 'wrong') {
    alert(msg[1]);
  }
});