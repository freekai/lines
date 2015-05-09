/*global define:false */
define(["config"], function (config) {
    "use strict";
    
    var field = [], // array, field representation
        size = config.game.size,
        cfg = config.draw;
    
    function initField() {
        var i, j, k;
        // field is a linear array of size fieldSize*fieldSize
        // position is calculated as index = x*fieldSize + y
        for (k = 0; k < size * size; k++) {
            i = Math.floor(k / size);
            j = k % size;
            field[k] = {
                i: i,
                j: j,
                color: null,
                ballX: i * (cfg.cellMargin + cfg.cellSize) + cfg.cellMargin + cfg.cellSize / 2,
                ballY: j * (cfg.cellMargin + cfg.cellSize) + cfg.cellMargin + cfg.cellSize / 2
            };
        }
    }
    
    initField();
    
    function isInside(i, j) {
        return ((i >= 0) && (i < size)) &&
                ((j >= 0) && (j < size));
    }

    function idx(i, j) {
        return i * size + j;
    }
    
    return {
        field: field,
        idx: idx,
        isInside: isInside,
        initField: initField
    };
        
});