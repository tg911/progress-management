connectionId = -1;

var blocklyArea = document.getElementById("blocklyArea");
var blocklyDiv = document.getElementById("blocklyDiv");
var workspace = Blockly.inject(blocklyDiv, {
  toolbox: document.getElementById('toolbox'),
  grid: {
    spacing: 20,
    length: 3,
    colour: '#ccc',
    snap: true
  },
  media: 'media/',
  zoom: {
    controls: true,
    startScale: 1.0,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2
  },
  trashcan: true
});

var onResize = function(e) {
  // Compute the absolute coordinates and dimensions of blocklyArea
  var element = blocklyArea;
  var x = 0;
  var y = 0;

  do {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  } while (element);
  //Position blocklyDiv over blocklyArea
  blocklyDiv.style.left = x + 'px';
  blocklyDiv.style.top = y + 'px';
  blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
  blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
  Blockly.svgResize(workspace);
};
window.addEventListener('resize', onResize, false);
onResize();
Blockly.svgResize(workspace);

function showCode() {
  var outputArea = document.getElementById("outputArea");
  var code = Blockly.IchigoJamBASIC.workspaceToCode(workspace);
  outputArea.innerHTML = code;
};
// workspaceのリスナーへ登録を忘れずに
workspace.addChangeListener(showCode);

function discard() {
  workspace.clear();
};

document.getElementById("discardYes").addEventListener("click", discard, false);

function setLineNumber() {
  var contents = document.getElementById("outputArea");
  var lineNum = 10;
  var code = contents.innerText;
  var sliceCode = code.split('');

  var sliceCodeLength = sliceCode.length;

  for (var i = 0; i < sliceCodeLength; i++) {
    if (i == 0) {
      sliceCode.splice(i, 0, lineNum, " ");
      sliceCodeLength += 2;
      lineNum += 10;
    }
    if (sliceCode[i] == "\n") {
      sliceCode.splice(i + 1, 0, lineNum, " ");
      sliceCodeLength += 2;
      lineNum += 10;
    }
  }
  sliceCode.splice(sliceCode.length - 2, 2);
  code = sliceCode.join("");
  contents.innerText = code;
};

workspace.addChangeListener(setLineNumber);

// アラートを表示する
function showAlert(alertStatus, message) {
  alertDiv = document.getElementById("alert");
  // ↓気持ち悪いのでjQueryのattr使って書き直そうかな
  alertDiv.innerHTML = "<div class=\"alert alert-" + alertStatus + " alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" aria-label=\"閉じる\"><span id=\"removeAlert\" aria-hidden=\"true\">×</span></button>" + message + "</div>"; // 実行順序の関係でid="alert"のクリックイベントが先に発火してしまうため、あえてbootstrapのdata-dismiss属性は使用しない。
  onResize();
};

// アラートを閉じる処理（あえてbootstrapの機能は使用しない）
document.getElementById("alert").addEventListener("click", function(e) {
  if (e.target.id == "removeAlert") {
    alertDiv = document.getElementById("alert");
    alertDiv.innerHTML = ""; // アラートを閉じるボタンに使用するdata-dismiss属性の代わりの処理
    onResize();
  };
}, false);

// 作成したプログラムを保存する
function save() {
  var fileName = document.getElementById("fileName").value;
  var xml = Blockly.Xml.workspaceToDom(workspace);
  var xmlText = Blockly.Xml.domToPrettyText(xml);
  var blob = new Blob([xmlText], {
    type: 'text/xml'
  });
  // イベントトリガがbuttonタグなので、aタグを生成する。（download属性はaタグのみ）
  var a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = fileName + ".xml";
  a.click();
  window.URL.revokeObjectURL(a.href); // blobとobjectURLの関連を削除（メモリ解放）
  showAlert("success", "プログラム　<strong> " + fileName + "</strong>　を保存しました。（場所：ダウンロードフォルダ）");
};

document.getElementById("saveYes").addEventListener("click", save, false);

// 外部からプログラムを読み込む
function load() {
  var input = document.createElement("input");
  input.type = "file";
  input.id = "loadFile";
  input.accept = "text/xml";

  input.addEventListener("change", function(event) {
    var file = event.target.files[0]; // inputから取得したFileListオブジェクトから読み込んだFileオブジェクトを取得
    var reader = new FileReader(); // Fileオブジェクトの情報を読み込むためにFileReaderオブジェクトを生成する
    reader.readAsText(file); // FileReaderオブジェクトにFileオブジェクトのテキスト情報を読み込む
    reader.onload = function() {
      var xml = Blockly.Xml.textToDom(reader.result); // readAsTextで読み込んだ情報はreader.resultで取得できる
      workspace.clear();
      Blockly.Xml.domToWorkspace(xml, workspace);
    };
    // たまにファイル読み込みに失敗するが原因不明
    // reader.onerror = function() {
    //   console.log("readError")
    // };
    // reader.onabort = function() {
    //   console.log("readError")
    // };
  }, false);
  input.click();
};

document.getElementById("load").addEventListener("click", load, false);

function showPorts() {
  chrome.serial.getDevices(function(devices) {
    var port = document.getElementById("portSelecter");
    for (var i = 0; i < devices.length; i++) {
      var option = document.createElement("option");
      option.value = devices[i].path;
      option.text = devices[i].displayName ? devices[i].displayName : devices[i].path;
      port.appendChild(option);
    }
  });
};

window.addEventListener("load", showPorts, false);

function setStatus(status) {
  document.getElementById("status").innerText = status;
  document.getElementById("communicate").innerText = status == "接続中" ? " 切断" : " 接続";
};

function connect() {
  var ports = document.getElementById("portSelecter");
  var selectedPort = ports.options[ports.selectedIndex].value;
  var status = document.getElementById("status");
  chrome.serial.connect(selectedPort, {
    bitrate: 115200,
    receiveTimeout: 5000
  }, function(connectionInfo) {
    connectionId = connectionInfo.connectionId; // 通信に関わるあらゆる関数内で使用されるのでconnectionIdをグローバル変数へ格納
    if (connectionId == -1) {
      setStatus("エラー");
      return;
    }
    setStatus("接続中");
    status.style.color = "#0054ab";
  });
};

function disconnect() {
  var status = document.getElementById("status");
  chrome.serial.disconnect(connectionId, function(result) {
    setStatus("未接続");
    status.style.color = "#e73700";
  });
};

function communicate() {
  var buttonStatus = document.getElementById("communicate").innerHTML;
  var ports = document.getElementById("portSelecter");
  var selectedIndex = ports.selectedIndex;
  if (selectedIndex == -1) { // ポートセレクタに要素が無い時にports.options[ports.selectedIndex].valueの値を取得しようとするとエラーになるのでselectedIndexを使用する
    showAlert("warning", "接続先が見つかりません。");
    return;
  }
  if (buttonStatus == " 接続") {
    connect();
  }
  if (buttonStatus == " 切断") {
    disconnect();
  }
}

document.getElementById("communicate").addEventListener("click", communicate, false);

function sendCharacter(char) {
  if (connectionId == -1) return;
  var buffer = new ArrayBuffer(1); // １バイト分（8bit）のバッファを確保
  var view = new Uint8Array(buffer); // 確保したバッファに格納できる値は符号無し8bit整数に指定
  view[0] = char;
  chrome.serial.send(connectionId, buffer, function(sendInfo) { // arraybufferの内容をconnection先に送る（必要ない？）
    // chrome.serial.flush(connectionId, function(result){ //
    //   console.log("flush:"+ result)
    // });
  });
};

function sendToIchigoJam() {
  var code = document.getElementById("outputArea").innerText;
  var sliceCode = code.split("");
  sliceCode.splice(0, 0, 'N', 'E', 'W', '\n');
  var buffer = new ArrayBuffer(sliceCode.length);
  var view = new Uint8Array(buffer);
  var progressBar = document.getElementById("progressBar");
  var progressValue = 0;
  var viewLength = view.length;
  var count = 1;
  var closeButton = document.getElementById("closeProgressBar");

  if (connectionId == -1) {
    showAlert("warning", "パソコンとIchigoJamを接続して下さい。");
    setTimeout(function() {
      closeButton.click();
    }, 1000);
    return;
  }

  if (code == "") {
    showAlert("warning", "プログラムを初期化しました。")
    setTimeout(function() {
      closeButton.click();
    }, 1000);
    return;
  }

  for (var i = 0; i < sliceCode.length; i++) {
    // 半角カナ文字に対応するには8bitの文字にする必要がある。（charCodeAtは16bitになる？）
    // var encoder = new TextEncoder("utf-8");
    // view[i] = encoder.encode(sliceCode[i]);
    console.log("view:" + view[i])
    view[i] = sliceCode[i].charCodeAt(0);
  }
  var intervalId = setInterval(function() {
    progressBar.style.width = progressValue + "%";
    progressValue = (count / viewLength) * 100;
    count++;
    sendCharacter(view[0]);
    console.log(view)
    view = view.slice(1);
    if (view.length == 0) {
      setTimeout(function() {
        progressBar.style.width = progressValue + "%";
      }, 500);
      clearInterval(intervalId);
      setTimeout(function() {
        showAlert("success", "プログラムの送信が完了しました。")
        closeButton.click();
      }, 500);
    }
  }, 20);
};

document.getElementById("send").addEventListener("click", sendToIchigoJam, false);

function sendCommand(command) {
  var closeButton = document.getElementById("closeProgressBar");
  if (connectionId == -1) {
    showAlert("warning", "パソコンとIchigoJamを接続して下さい。");
    setTimeout(function() {
      closeButton.click();
    }, 1000);
    return;
  }
  var sliceCommand = command.split("");
  for (var i = 0; i < sliceCommand.length; i++) {
    sliceCommand[i] = sliceCommand[i].charCodeAt(0);
  }
  var intervalId = setInterval(function() {
    sendCharacter(sliceCommand[0]);
    sliceCommand = sliceCommand.slice(1);
    if (sliceCommand.length == 0) {
      clearInterval(intervalId);
    }
  }, 20);
};

document.getElementById("run").addEventListener("click", function(){sendCommand("RUN\n")}, false);

document.getElementById("toggle").addEventListener("click", function() {
  setTimeout(onResize, 350);
}, false);
