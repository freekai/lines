/*global define:false, Event:false, window:false, document:false, setInterval:false, console:false, CustomEvent:false */
define(["field", "config"], function (field, config) {
    "use strict";
    
    var cnvs,
        ctx,
        sel, // current selection
        cfg = config.draw,
        fieldSize = config.game.size;

    
    function drawField() {
        var grad,
            i,
            offset;
        if (!cnvs) {
            return;
        }
        // draw the field grid
        ctx.beginPath();
        ctx.lineWidth = cfg.cellMargin;
        ctx.strokeStyle = "#eee";
        ctx.shadowColor = "#999";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = cfg.cellMargin / 2;
        for (i = 0, offset = 2; i < fieldSize + 1; i++, offset += cfg.cellMargin + cfg.cellSize) {
            ctx.moveTo(0, offset);
            ctx.lineTo(cnvs.width, offset);
            ctx.stroke();
        }
        ctx.shadowOffsetX = cfg.cellMargin / 2;
        ctx.shadowOffsetY = 0;
        for (i = 0, offset = 2; i < fieldSize + 1; i++, offset += cfg.cellMargin + cfg.cellSize) {
            ctx.moveTo(offset, 0);
            ctx.lineTo(offset, cnvs.height);
            ctx.stroke();
        }
        ctx.closePath();
        // final touch -- the rightmost border and the bottom one
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "#999";
        ctx.moveTo(0, cnvs.height - cfg.cellMargin / 4);
        ctx.lineTo(cnvs.width, cnvs.height - cfg.cellMargin / 4);
        ctx.stroke();
        ctx.moveTo(cnvs.width - cfg.cellMargin / 4, 0);
        ctx.lineTo(cnvs.width - cfg.cellMargin / 4, cnvs.height - cfg.cellMargin / 4);
        ctx.stroke();
        ctx.closePath();
    }

    function initCanvas(elem) {
        // calculate size
        var size = config.game.size * (cfg.cellSize + cfg.cellMargin) + cfg.cellMargin * 1.5,
            pixRatio = window.devicePixelRatio || 1;
        cnvs = elem;
        ctx = cnvs.getContext("2d");
        cnvs.width = size * pixRatio;
        cnvs.height = size * pixRatio;
        if (pixRatio !== 1) {
            cnvs.style.width = size + 'px';
            cnvs.style.height = size + 'px';
            ctx.scale(pixRatio, pixRatio);
        }
        ctx.fillStyle = "#ddd";
        ctx.fillRect(0, 0, size, size);
        drawField();
    }

    function drawBall(x, y, r, color) {
        var grd = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x - r * 0.2, y - r * 0.2, r / 2);
        grd.addColorStop(0.0, "#f5f5f5");
        grd.addColorStop(1.0, color);
        ctx.shadowOffsetX = r * 0.1;
        ctx.shadowOffsetY = r * 0.1;
        ctx.shadowBlur = r * 0.1;
        ctx.strokeStyle = color;
        ctx.fillStyle = grd;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }

    function eraseCell(i, j) {
        var cell = field.field[field.idx(i, j)];
        var x, y;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ddd";
        ctx.fillStyle = "#ddd";
        ctx.lineWidth = 0;
        ctx.beginPath();
        ctx.arc(cell.ballX, cell.ballY, cfg.cellSize / 2 - cfg.cellMargin - 1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }

    var animPathState = {
        r: 0,
        path: null,
        color: null,
        stop: true
    };
    
    var evnt = new CustomEvent(
        "doneAnimating",
        {
            detail: {
                ball: null
            },
            bubbles: true,
            cancelable: true
        }
    );

    function animatePath() {
        var r = --animPathState.r,
            cpath = animPathState.path,
            color = animPathState.color,
            k,
            c;
        if (r < 0 && r + 2 > 0) {
            if (cpath && cpath[0]) {
                evnt.detail.ball = cpath[0];
                cnvs.dispatchEvent(evnt);
                for (k = 1; k < cpath.length; k++) {
                    c = cpath[k];
                    if (!c.color) {
                        eraseCell(c.i, c.j);
                    }
                }
            }
        } else if (r > 0) {
            for (k = 1; k < cpath.length; k++) {
                c = cpath[k];
                if (!c.color) {
                    eraseCell(c.i, c.j);
                    drawBall(c.ballX, c.ballY, animPathState.r, color);
                }
            }
        }
    }

    var animSelState = {
        ch: 0,
        dir: -1
    };

    function animateSelected() {
        var cell = sel;
        var height;
        var dir = -1;
        var ch = animSelState.ch; // current height
        var x, y;
        var r  = 3 / 10 * cfg.cellSize;
        if (!cell) {
            return;
        }
        height = Math.floor(5 * r / 12);
        x = cell.ballX;
        y = cell.ballY;

        eraseCell(cell.i, cell.j);
        ch++;
        if (ch === height) {
            ch = 0;
            dir *= -1;
        }
        animSelState.ch = ch;
        animSelState.dir = dir;
        y += ch * dir;
        var grd = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x - r * 0.2, y - r * 0.2, r / 2);
        grd.addColorStop(0.0, "#f5f5f5");
        grd.addColorStop(1.0, cell.color);
        ctx.shadowOffsetX = r * 0.1;
        ctx.shadowOffsetY = r * 0.1 + ch;
        ctx.shadowBlur = r * 0.1;
        ctx.strokeStyle = cell.color;
        ctx.fillStyle = grd;
        ctx.lineWidth = 0;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }
    
    function moveBall(i, j, path) {
        var start = field.field[field.idx(i, j)];
        var color = start.color;
        var h;
        var dest = path[0];
        start.color = null;
        eraseCell(i, j);
        dest.color = color;
        drawBall(dest.ballX, dest.ballY, 3 / 10 * cfg.cellSize, color);
        path.push(start);
        animPathState.r = Math.floor(3 / 10 * cfg.cellSize / 2);
        animPathState.path = path;
        animPathState.color = color;
        animPathState.stop = false;
    }
    
    setInterval(animateSelected, 100);
    setInterval(animatePath, 100);
    
    return {
        initCanvas: initCanvas,
        drawField: drawField,
        drawBall: drawBall,
        eraseCell: eraseCell,
        moveBall: moveBall,
        setSelection: function (cell) { sel = cell; },
        getSelection: function () { return sel; }
    };
});