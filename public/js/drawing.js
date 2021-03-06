// var svg_to_png = require('svg-to-png');

paper.install(window);
var myColor = new Color(0, 0, 0);
var myTool = "Path";
var socket = io.connect('http://localhost:3000');
var usersPaths = {};
var myRoom = 0;
var myId = 0;
var myUsername = 0;

socket.on('path_request_u', function (id, point, color) {
    console.log(color);
    usersPaths[id] = new Path({
        segments: [new Point(point[1], point[2])],
        // Select the path, so we can see its segment points:
        fullySelected: false
    });
    usersPaths[id].strokeColor = new Color(color[1], color[2], color[3]);
    usersPaths[id].strokeWidth = 10;
});

socket.on('path_point_u', function (id, point) {
    usersPaths[id].add(new Point(point[1], point[2]));
});

socket.on('path_end_u', function (id) {
    usersPaths[id].simplify(10);
    usersPaths[id] = null;
});

socket.on('rect_u', function (point, size, color) {
    new Path.Rectangle({
        position: new Point(point[1], point[2]),
        size: size,
        fillColor: new Color(color[1], color[2], color[3])
    });
});

socket.on('circle_u', function (point, size, color) {
    new Path.Circle({
        center: new Point(point[1], point[2]),
        radius: size,
        fillColor: new Color(color[1], color[2], color[3])
    });
});

socket.on('msg_u', function (id, msg) {
    if (id != myId) {
        $(".chat-block").append(msg);
        $('.chat-block').animate({scrollTop: $('.chat-block li').prop("scrollHeight")}, 500);
        $('.nano-content').animate({scrollTop: $(".chat-block li").last().offset().top}, 'slow');
    }
});

socket.on('join:load_page', function (json) {
    console.log('.......................');
    paper.project.importJSON(json)
});

window.onload = function () {

    myId = document.getElementById('user-id').innerHTML;
    myUsername = document.getElementById('user-name').innerHTML;
    myRoom = document.getElementById('room-id').innerHTML;

    document.getElementById("chat_height").setAttribute('style', 'height: ' + String(parseInt(window.innerHeight * 0.87) + "px"));
    document.getElementById("row_canvas").setAttribute('style', 'height: ' + String(parseInt(window.innerHeight * 0.87) + "px"));

    document.getElementById("myCanvas").setAttribute('width', window.innerWidth * 0.8);
    document.getElementById("myCanvas").setAttribute('height', window.innerHeight * 0.95);
    paper.setup('myCanvas');


    var path;
    var circle;
    var rect;
    var size_;
    var tool = new Tool();


    socket.emit('join', myRoom, myId);


    tool.onMouseDown = function (event) {

        if (myTool == 'Path') {
            // Create a new path and set its stroke color to black:
            path = new Path({
                segments: [event.point],
                // Select the path, so we can see its segment points:
                fullySelected: false
            });
            path.strokeColor = myColor;
            path.strokeWidth = 10;
            socket.emit('path_request', myRoom, myId, event.point, myColor)
        } else if (myTool == 'Rect') {
            rect = new Path.Rectangle({
                position: event.point,
                size: 20,
                fillColor: myColor
            });
        } else {
            circle = new Path.Circle({
                center: event.point,
                radius: 20,
                fillColor: myColor
            });
        }
    };


    tool.onMouseDrag = function (event) {
        if (myTool == 'Path') {
            path.add(event.point);
            socket.emit('path_point', myRoom, myId, event.point)
        } else if (myTool == 'Rect') {
            var p = rect.position;
            rect.remove();
            size_ = Math.sqrt(Math.pow(p.x - event.point.x, 2) + Math.pow(p.y - event.point.y, 2));
            rect = new Path.Rectangle({
                position: p,
                size: size_,
                fillColor: myColor
            });
        } else {
            var p = new Point(circle.position);
            circle.remove();
            size_ = Math.sqrt(Math.pow(p.x - event.point.x, 2) + Math.pow(p.y - event.point.y, 2));
            circle = new Path.Circle({
                center: p,
                radius: size_,
                fillColor: myColor
            });
        }
    };

// When the mouse is released, we simplify the path:
    tool.onMouseUp = function (event) {
        if (myTool == 'Path') {
            // When the mouse is released, simplify it:
            path.simplify(10);

            socket.emit('path_end', myRoom, myId)
        } else if (myTool == "Rect") {
            socket.emit('rect', myRoom, myId, rect.position, size_, myColor)
        } else {
            socket.emit('circle', myRoom, myId, circle.position, size_, myColor)
        }
    };

};

function changeColor(r, g, b) {
    myColor = new Color(r, g, b);
}

function changeMyTool(t) {
    myTool = t;
}

function sendMessage() {
    var msg = document.getElementById('input');

    var username = myUsername;
    var time = new Date();

    var msg_full_me = '<li class="mar-btm">' +
        '<div class="media-left">' +
        '<img src="/img/avatar1.png" class="img-circle img-sm" alt="Profile Picture">' +
        '</div>' +
        '<div class="media-body pad-hor">' +
        '<div class="speech">' +
        '<a href="#" class="media-heading">' + username + '</a>' +
        '<p>' +
        msg.value +
        '</p>' +
        '<p class="speech-time">' +
        '<i class="fa fa-clock-o fa-fw"></i> ' + time +
        '</p>' +
        '</div>' +
        '</div>' +
        '</li>';

    var msg_full_them = '<li class="mar-btm">' +
        '<div class="media-right">' +
        '<img src="/img/avatar1.png" class="img-circle img-sm" alt="Profile Picture">' +
        '</div>' +
        '<div class="media-body pad-hor speech-right">' +
        '<div class="speech">' +
        '<a href="#" class="media-heading">' + username + '</a>' +
        '<p>' +
        msg.value +
        '</p>' +
        '<p class="speech-time">' +
        '<i class="fa fa-clock-o fa-fw"></i> ' + time +
        '</p>' +
        '</div>' +
        '</div>' +
        '</li>';

    $(".chat-block").append(msg_full_me);
    $('.chat-block').animate({scrollTop: $('.chat-block li').prop("scrollHeight")}, 500);
    $('.nano-content').animate({scrollTop: $(".chat-block li").last().offset().top}, 'slow');

    socket.emit('msg', myRoom, myId, msg_full_them);
    msg.value = "";
}

function screenshot() {

    var canvas = document.getElementById("myCanvas");

    var fileName = 'tezy.png';

    if ('msToBlob' in canvas) { // IE10+
        var blob = canvas.msToBlob();
        navigator.msSaveBlob(blob, fileName);
    } else {
        var a = document.createElement('a');
        a.setAttribute('href', canvas.toDataURL().replace("image/png", "image/octet-stream"));
        a.setAttribute('target', '_blank');
        a.setAttribute('download', fileName);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // var img    = canvas.toDataURL("jpg");
    // var img = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
    // // window.location.href = img;
    // var download = document.createElement('a');
    // download.href = img;
    // download.download = "myImage.jpg";
    // // document.body.appendChild(download);
    // download.click();
}