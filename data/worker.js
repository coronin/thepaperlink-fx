var ws,
  req_key,
  broadcast_loaded = 0,
  DEBUG = true;

self.port.on('req_key', function(m) {
  req_key = m[0];
  broadcast_loaded = 0;
  if (ws) {
    ws.close();
  }
  load_broadcast(m[1]);
});

self.on('message', function(m) {
  ws.send(m);
});

function load_broadcast(ws_addr) {
  var _self = this;
  this.start = function () {
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if (!window.WebSocket) {
      return;
    }
    ws = new WebSocket('ws://' + ws_addr);

    ws.onopen = function () {
      DEBUG && console.log('>> ws is established');
      broadcast_loaded = 1;
      ws.send('{"apikey":"' + req_key + '"}');
    };

    ws.onclose = function () {
      if (broadcast_loaded === 1) {
        console.log('__ server comminucation lost, reconnecting...');
        load_try -= 1;
        clearTimeout(_self.refresh);
        if (load_try < 0) {
          DEBUG && console.log('>> ws is broken');
          broadcast_loaded = 0;
          return;
        }
        setTimeout(_self.start, 3000);
      } else {
        DEBUG && console.log('>> ws is closed');
      }
    };
    //setInterval(function() {
    //  if (ws.readyState !== 1) {
    //    console.log('__ unable to comminucate with the WebSocket server');
    //  }
    //}, 3000);

    ws.onerror = function (err) {
      DEBUG && console.log('>> ws error: ' + err);
    };

    ws.onmessage = function (message) {
      self.postMessage(message.data);
    };
  }
  _self.start();
}