/*global define:false, require: false, document:false */
require.config({
    baseUrl: "/js"
});

/*global define:false, window:false */
define(["draw", "field", "config", "3rd/domReady!"], function (draw, field, config) {
    "use strict";
    var score = 0,
        cfg = config.draw,
        size = config.game.size,
        cnvs,
        sel,
        scoreBoard;

    var ih; // interval handler
    
    function minDist(i, j, graph) {
        var min = Number.MAX_VALUE,
            minIdx = -1,
            k;
        for (k = 0; k < size * size; k++) {
            if (graph[k].incl) {
                if (graph[k].dist < min) {
                    min = graph[k].dist;
                    minIdx = k;
                }
            }
        }
        return minIdx;
    }

    // shift from the current (i, j) to get to the neighbors
    var _neighbors = [[-1, 0], [0, -1], [1, 0], [0, 1]];

    // simple Dijkstra's algorithm implementation
    // TODO: inefficient minDist -- requires walk though entire graph
    // TODO: inefficient reduce -- might not be even needed, other conditions within
    // the cycle will be satisfied sooner
    function findPath(ib, jb, ie, je) {
        var graph = [],
            path = [],
            length,
            k;
        for (k = 0; k < size * size; k++) {
            graph[k] = { incl: 1, dist: Number.MAX_VALUE, prev: -1 };
        }
        graph[field.idx(ib, jb)].dist = 0;
        
        function avail(x, y) { return (y.incl) ? x + 1 : x; }

        var minIdx = -1;
        while (graph.reduce(avail, 0)) {
            minIdx = minDist(ib, jb, graph);
            var imin = Math.floor(minIdx / size);
            var jmin = minIdx % size;
            if (minIdx < 0) {
                break;
            }
            graph[minIdx].incl = 0;
            if (imin === ie && jmin === je) {
                break;
            }
            if (graph[minIdx].dist === Number.MAX_VALUE) {
                break;
            }
            for (k = 0; k < _neighbors.length; k++) {
                var ic, jc; // i and j of each neighbor
                var alt;
                ic = imin + _neighbors[k][0];
                jc = jmin + _neighbors[k][1];
                if (field.isInside(ic, jc) &&
                        !field.field[field.idx(ic, jc)].color &&
                        graph[field.idx(ic, jc)]) {

                    alt = graph[minIdx].dist + 1;
                    if (alt < graph[field.idx(ic, jc)].dist) {
                        graph[field.idx(ic, jc)].dist = alt;
                        graph[field.idx(ic, jc)].prev = minIdx;
                    }
                }
            }
        }
        k = minIdx;
        if (k < 0) {
            return null; // path has not been found
        }
        while (graph[k].prev >= 0) {
            path.push(field.field[k]);
            k = graph[k].prev;
        }
        return path;
    }

    function select(event) {
        var x, y; // positions within the canvas
        var i, j; // matrix indices of the cell

        x = event.pageX + (window.pageXScroll || 0) - cnvs.offsetLeft;
        y = event.pageY + (window.pageYScroll || 0) - cnvs.offsetTop;

        // NB: is not worth a separate function
        i = Math.floor(x / (cfg.cellSize + cfg.cellMargin));
        j = Math.floor(y / (cfg.cellSize + cfg.cellMargin));

        if (!sel) {
            // no selection. simply change selection to the picked cell if the ball
            // is there
            if (field.field[field.idx(i, j)].color) {
                draw.setSelection((sel = field.field[field.idx(i, j)]));
                return;
            }
        } else {
            var path = null;
            if (field.field[field.idx(i, j)].color) {   // if other ball is selected, redraw the
                                            // ball and change selection
                draw.eraseCell(sel.i, sel.j);
                draw.drawBall(sel.ballX, sel.ballY, 3 / 10 * cfg.cellSize, sel.color);
                draw.setSelection((sel = field.field[field.idx(i, j)]));
                return;
            }
            if ((path = findPath(sel.i, sel.j, i, j)) !== null) {
                draw.moveBall(sel.i, sel.j, path);
                draw.setSelection((sel = null));
            } else {
                window.alert("cannot find path");
            }
        }
    }

    
    function updateScoreBoard() {
        scoreBoard.innerHTML = score;
    }

    var _line_directions = [[1, -1], [1, 1], [1, 0], [0, 1]];

    function killBalls(i, j) {
        var pt = field.field[field.idx(i, j)], // what we just moved/inserted
            line = [],
            killed = 0,
            k;
        var di, dj;
        var ic, jc; // current ball index
        var sorter = function (x, y) { return (y.i - x.i) || (y.j - x.j); };
        line.push(pt);
        for (k = 0; k < _line_directions.length; k++) { // over 4 possible directions
            di = _line_directions[k][0];
            dj = _line_directions[k][1];
            ic = pt.i + di;
            jc = pt.j + dj;
            while (field.isInside(ic, jc) && field.field[field.idx(ic, jc)].color === pt.color) {
                line.push(field.field[field.idx(ic, jc)]);
                ic += di;
                jc += dj;
            }
            // reverse direction
            ic = pt.i - di;
            jc = pt.j - dj;
            while (field.isInside(ic, jc) && field.field[field.idx(ic, jc)].color === pt.color) {
                line.push(field.field[field.idx(ic, jc)]);
                ic -= di;
                jc -= dj;
            }
            if (line.length > 4) { // got line
                // TODO: calculate scores and everything
                // sort and kill
                var origin = line.shift(),
                    lineSorted = line.sort(sorter),
                    b;
                for (b = 0; b < lineSorted.length; b++) {
                    lineSorted[b].color = null;
                    draw.eraseCell(lineSorted[b].i, lineSorted[b].j);
                    killed++;
                }
                line.unshift(origin);
                line.length = 1; // truncate
            } else {
                line.length = 1; // truncate
            }
        }
        if (killed) { // we have origin left at the beginning of the array
            line[0].color = null;
            draw.eraseCell(line[0].i, line[0].j);
            killed++;

            // update score
            // calculated as 10 for 5 balls, for more: 2*killed+(2*(killed-6)+1)
            if (killed === 5) {
                score += 10;
            } else {
                score += 2 * killed + 2 * (killed - 6) + 1;
            }
            updateScoreBoard();
        }
        return killed;
    }

    function newBalls() {
        var i;
        // three balls at a time
        function unoccupied(x, y) { if (!y.color) { x.push(y); } return x; }
        for (i = 0; i < 3; i++) {
            var ctx,
                rndIdx1,
                rndIdx2,
                avail = field.field.reduce(unoccupied, []),
                s;
            rndIdx1 = Math.floor(Math.random() * avail.length);
            s = avail[rndIdx1];
            rndIdx2 = Math.floor(Math.random() * config.draw.colors.length);
            s.color = config.draw.colors[rndIdx2];
            draw.drawBall(s.ballX, s.ballY, 3 / 10 * cfg.cellSize, s.color);
            if (!killBalls(s.i, s.j)) {
                if (avail.length === 1) {
                    return -1;
                }
            }
        }
        return 0;
    }

    function checkAndInsert(evnt) {
        if (!killBalls(evnt.detail.ball.i, evnt.detail.ball.j)) {
            if (newBalls() < 0) {
                window.alert("Your score: " + scoreBoard.textContent + "!");
            }
        }
    }
    
    cnvs = document.getElementById("playground");
    scoreBoard = document.getElementById("score");
    draw.initCanvas(cnvs);
    newBalls();
    cnvs.addEventListener("click", select);
    cnvs.addEventListener("doneAnimating", checkAndInsert);
});