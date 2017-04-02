var board,
    boardEl = $('#board'),
    game = new Chess(),
    squareToHighlight;

var positionCount, moveTime, positionsPerS;


/****************************** AI STUFF START *******************************/

var getPieceValue = function (piece) {
    if (piece === null) {
        return 0;
    }
    var getAbsoluteValue = function (piece) {
        if (piece.type === 'p') {
            return 10;
        } else if (piece.type === 'r') {
            return 50;
        } else if (piece.type === 'n') {
            return 32;
        } else if (piece.type === 'b') {
            return 33 ;
        } else if (piece.type === 'q') {
            return 90;
        } else if (piece.type === 'k') {
            return 900;
        }
        throw "Unknown piece type: " + piece.type;
    };

    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w');
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
};

var evaluateBoard = function (board) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j]);
        }
    }
    return totalEvaluation;
};

var evaluateGame = function (game) {
    positionCount++;
    if (game.in_checkmate())
        return game.turn() == 'b' ? 9999 : -9999;
    if (game.game_over())
        return 0;
    return evaluateBoard(game.board());
}

var calculateBestMove = function(game) {
    var moves = game.ugly_moves();
    var turn = game.turn() == 'w' ? 1 : -1;
    var bestMove = null;
    var bestValue = -9999;
    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.ugly_move(move);
        var value = evaluateGame(game) * turn;
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
        game.undo();
    }
    return bestMove;
}

var calculateBestMinMaxMove = function(depth, game, isWhite) {
    var moves = game.ugly_moves();
    var turn = game.turn() == 'w' ? 1 : -1;
    var bestValue = -9999;
    var bestMove = null;

    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.ugly_move(move);
        var value = minmax(depth - 1, game, -10000, 10000, !isWhite) * turn;
        game.undo();
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    }
    return game.make_pretty(bestMove);
}

var minmax = function (depth, game, alpha, beta, isMaximize) {
    if (depth == 0) {
        return evaluateGame(game);
    }
    var moves = game.ugly_moves();
    if (isMaximize) {
        var bestValue = -9999;
        for (var i = 0; i < moves.length; i++) {
            game.ugly_move(moves[i]);
            bestValue = Math.max(bestValue, minmax(depth - 1, game, alpha, beta, !isMaximize));
            game.undo();
            alpha = Math.max(alpha, bestValue);
            if (beta <= alpha)
                break;
        }
        return bestValue;
    } else {
        var bestValue = 9999;
        for (var i = 0; i < moves.length; i++) {
            game.ugly_move(moves[i]);
            bestValue = Math.min(bestValue, minmax(depth - 1, game, alpha, beta, !isMaximize));
            game.undo();
            beta = Math.min(beta, bestValue);
            if (beta <= alpha)
                break;
        }
        return bestValue;
    }
}

var makeBestSingleMove = function () {
    console.log("Making best move");
    var possibleMoves = game.moves();
    console.log("Number of possible moves:",possibleMoves.length);
    // game over
    if (possibleMoves.length === 0) return;

    positionCount = 0;
    var d = new Date().getTime();

    var move = calculateBestMove(game);

    var d2 = new Date().getTime();
    moveTime = (d2 - d);
    positionsPerS = ( positionCount * 1000 / moveTime);

    if (move == null) {
        console.log("Couldn't find a move!?")
        return;
    }

    game.move(move);

    console.log("Made best single move", move);

    console.log("Update board");
    board.position(game.fen());
};

var makeBestMinMaxMove = function () {
    console.log("Making best MinMax move - depth 3");
    var possibleMoves = game.moves();

    // game over
    if (possibleMoves.length === 0) return;

    var depth = parseInt($('#search-depth').find(':selected').text());

    positionCount = 0;
    var d = new Date().getTime();
    var move = calculateBestMinMaxMove(depth, game, game.turn() == 'w');
    var d2 = new Date().getTime();
    moveTime = (d2 - d);
    positionsPerS = ( positionCount * 1000 / moveTime);

    if (move == null) {
        console.log("Couldn't find a move!?")
        return;
    }

    game.move(move);

    console.log("Made best MinMax move", move.san);

    console.log("Update board");
    board.position(game.fen());
}

/******************************* AI STUFF END ********************************/

var makeRandomMove = function() {
    console.log("Making random move");
    var possibleMoves = game.moves();
    console.log("Number of possible moves:",possibleMoves.length);
    // game over
    if (possibleMoves.length === 0) return;

    var randomIndex = Math.floor(Math.random() * possibleMoves.length);
    var move = possibleMoves[randomIndex]
    game.move(move);

    console.log("Made move", move);

    console.log("Update board");
    board.position(game.fen());
};

var updateBoardStats = function() {
    var history =game.history();
    $('#movelist').prepend('<li>'+history[history.length-1]+'</li>');
    console.log('<li>'+history[history.length-1]+'</li>');
    $('#num-moves').text(history.length);
    $('#board-value').text(evaluateGame(game));
    $('#position-count').text(positionCount);
    $('#time').text(moveTime/1000 + 's');
    $('#positions-per-s').text(positionsPerS);
}


// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function(source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1) {
        return false;
    }
};

var onDrop = function(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    // highlight white's move
    removeHighlights('white');
    boardEl.find('.square-' + source).addClass('highlight-white');
    boardEl.find('.square-' + target).addClass('highlight-white');

    updateBoardStats();

    // make random legal move for black
    window.setTimeout(nextMove, 250);
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
    board.position(game.fen());
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var removeHighlights = function(color) {
    boardEl.find('.square-55d63')
        .removeClass('highlight-' + color);
};

var onMouseoverSquare = function(square, piece) {
    // get list of possible moves for this square
    var moves = game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var onMoveEnd = function() {
    boardEl.find('.square-' + squareToHighlight)
        .addClass('highlight-black');
    updateBoardStats();
    window.setTimeout(nextMove, 250);
};

var nextMove = function() {
    if (game.game_over()) {
        alert("Game Over");
        return;
    }
    if (game.turn() == 'w') {
        //makeBestMinMaxMove();
    } else {
        makeBestMinMaxMove();
        //makeBestSingleMove();
    }
}

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onMoveEnd: onMoveEnd,
    onSnapEnd: onSnapEnd
};

board = ChessBoard('board', cfg);
nextMove();