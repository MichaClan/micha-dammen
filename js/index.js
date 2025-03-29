const main = document.querySelector('main'); // Variabelen
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const gameModeSelect = document.getElementById('gameMode');
let highlightedCells = null;

let selectedPiece = null; // Checkt de geselecteerde pieces
let currentPlayer = 'black'; // Tracks wie aan het beurt is
let offsetX = 0;
let offsetY = 0;
let dragging = false; // Checken of piece dragged is of niet
let aiMode = false; // Kijkt of AI aan het werk is (Work in progress)

let blackWins = 0;
let whiteWins = 0;

// Functie om bord te maken om te spelen
function createBoard() {
    main.innerHTML = ''; // Inner HTML leeg maken voor bord
    for (let i = 0; i < 64; i++) { // Dammen heeft 64 vakjes nodig
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i; // Store cell index
        const row = Math.floor(i / 8);
        const col = i % 8;
        cell.dataset.row = row; // Store row and column
        cell.dataset.col = col;

        if ((row + col) % 2 === 0) {
            cell.style.backgroundColor = 'brown'; // Dark square
            cell.classList.add('playable'); // Pieces kunnen alleen spelen op dark squares
        } else {
            cell.style.backgroundColor = 'lightgray'; // Light square
        }

        // Black pieces vullen bovenste gedeelte
        if (i < 24 && (row + col) % 2 === 0) {
            const piece = document.createElement('div');
            piece.classList.add('piece', 'black');
            piece.addEventListener('mousedown', startDrag); // Event listener for pieces bewegen en schuiven
            cell.appendChild(piece);
        }
        // Witte pieces vullen onderste gedeelte van bord
        else if (i >= 40 && (row + col) % 2 === 0) {
            const piece = document.createElement('div');
            piece.classList.add('piece', 'white');
            piece.addEventListener('mousedown', startDrag); // Event listener voor bewegen
            cell.appendChild(piece);
        }

        main.appendChild(cell);
    }
    updateTurnDisplay(); // Update display aan begin van spel
}

// Functie om piece te beginnen met schuiven
function startDrag(e) { 
    const piece = e.target;

    // Alleen currentPlayer kan pieces verschuiven zodat andere speler niet zijn eigen pieces kan bewegen terwijl die niet aan de beurt is
    if (!piece.classList.contains(currentPlayer)) return;

    selectedPiece = piece;
    piece.classList.add('dragging');
    offsetX = e.clientX - piece.getBoundingClientRect().left;
    offsetY = e.clientY - piece.getBoundingClientRect().top;
    dragging = true;
    document.addEventListener('mousemove', dragPiece);
    document.addEventListener('mouseup', dropPiece);

    // Highlight mogelijke moves 
    highlightMoves(piece.parentElement);
}

// Functie om die piece te verschuiven met muis
function dragPiece(e) { 
    if (selectedPiece && dragging) {
        selectedPiece.style.left = `${e.clientX - offsetX}px`;
        selectedPiece.style.top = `${e.clientY - offsetY}px`;
        selectedPiece.style.position = 'absolute';
        selectedPiece.style.zIndex = '1000';
    }
}

// Functie om die steen lost te laten zodat die land op een vak
function dropPiece(e) {
    if (selectedPiece && dragging) {
        const x = e.clientX;
        const y = e.clientY;
        let targetCell = null;

        for (let i = 0; i < highlightedCells.length; i++) {
            const cellRect = highlightedCells[i].getBoundingClientRect();
            if (x > cellRect.left && x < cellRect.right && y > cellRect.top && y < cellRect.bottom) {
                targetCell = highlightedCells[i];
                break;
            }
        }
        
        if (targetCell) {
            console.log('Valid move to', targetCell);
            movePieceToCell(selectedPiece, targetCell);
        } else {
            console.log('Invalid move, resetting piece');
            resetPiecePosition(selectedPiece);
        }

        selectedPiece.classList.remove('dragging');
        selectedPiece = null;
        dragging = false;

        // Remove event listeners
        document.removeEventListener('mousemove', dragPiece);
        document.removeEventListener('mouseup', dropPiece);
        clearHighlights();
    }
}

// Functie om piece position te resetten als een move niet toegestaan is
function resetPiecePosition(piece) {
    piece.style.left = '';
    piece.style.top = '';
    piece.style.position = '';
}

// Functie om een piece naar juiste cel/vakje te brengen
function movePieceToCell(piece, cell) {
    const currentCell = piece.parentElement;
    const currentIndex = Array.from(main.children).indexOf(currentCell);
    const targetIndex = Array.from(main.children).indexOf(cell);

    const currentRow = Math.floor(currentIndex / 8);
    const targetRow = Math.floor(targetIndex / 8);

    const currentCol = currentIndex % 8;
    const targetCol = targetIndex % 8;

    const rowDiff = Math.abs(targetRow - currentRow);
    const colDiff = Math.abs(targetCol - currentCol);

    let captured = false;
    if (rowDiff === 2 && colDiff === 2) {
        // Check als er een tegenstander's piece tussen ligt
        const middleRow = (currentRow + targetRow) / 2;
        const middleCol = (currentCol + targetCol) / 2;
        const middleIndex = middleRow * 8 + middleCol;
        const middleCell = main.children[middleIndex];
        const middlePiece = middleCell.firstChild;

        if (middlePiece && middlePiece.classList.contains(currentPlayer === 'black' ? 'white' : 'black')) {
            middleCell.removeChild(middlePiece); //Als er wel een piece van tegenstander tussen ligt, dan kan je opeten
            captured = true;
        }
    } else if (selectedPiece.classList.contains('king') && rowDiff === colDiff) {
        // Check voor meerdere captures voor king
        let stepRow = (targetRow - currentRow) / rowDiff;
        let stepCol = (targetCol - currentCol) / colDiff;
        let capturedPieceIndex = -1;

        for (let i = 1; i < rowDiff; i++) {
            const intermediateRow = currentRow + i * stepRow;
            const intermediateCol = currentCol + i * stepCol;
            const intermediateIndex = intermediateRow * 8 + intermediateCol;
            const intermediateCell = main.children[intermediateIndex];
            const intermediatePiece = intermediateCell.firstChild;

            if (intermediatePiece) {
                if (intermediatePiece.classList.contains(currentPlayer === 'black' ? 'white' : 'black')) {
                    if (capturedPieceIndex === -1) {
                        capturedPieceIndex = intermediateIndex; // Tegenstander's piece vinden
                    } else {
                        capturedPieceIndex = -1; // Meer dan een piece in de gang die blokkeert, dan kan nie opeten
                        break;
                    }
                } else {
                    capturedPieceIndex = -1; // Als je eigen team's piece in de gang zit, dan kan niet
                    break;
                }
            }
        }

        if (capturedPieceIndex !== -1) {
            const capturedCell = main.children[capturedPieceIndex];
            const capturedPiece = capturedCell.firstChild;
            capturedCell.removeChild(capturedPiece); // Eet tegenstander's piece
            captured = true;
        }
    }

    cell.appendChild(piece);
    piece.style.left = '';
    piece.style.top = '';
    piece.style.position = '';
    piece.style.zIndex = '';

    promoteToKing(cell, piece.classList.contains('black') ? 'black' : 'white'); // Piece wordt king als moet

    // Check of de piece weer iemand kan opeten
    if (captured && canCapture(cell, piece.classList.contains('black') ? 'black' : 'white', piece.classList.contains('king'))) {
        highlightMoves(cell);
        selectedPiece = piece;
        piece.classList.add('dragging');
        document.addEventListener('mousemove', dragPiece);
        document.addEventListener('mouseup', dropPiece);
    } else {
        switchTurn(); // Wissel beurten als er geen gangbare moves zijn
    }

    checkGameOver(); // Check for game over after each move
}

// Functie om te checken of piece anderen op kan eten
function canCapture(cell, pieceColor, isKing) {
    const cellIndex = Array.from(main.children).indexOf(cell);
    const row = Math.floor(cellIndex / 8);
    const col = cellIndex % 8;

    // Check alle mogelijke kanten
    const directions = [
        { dRow: 2, dCol: 2 },
        { dRow: 2, dCol: -2 },
        { dRow: -2, dCol: 2 },
        { dRow: -2, dCol: -2 }
    ];

    for (const { dRow, dCol } of directions) {
        const targetRow = row + dRow;
        const targetCol = col + dCol;
        if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) continue;

        const middleRow = row + dRow / 2;
        const middleCol = col + dCol / 2;
        const middleIndex = middleRow * 8 + middleCol;
        const targetIndex = targetRow * 8 + targetCol;

        const middleCell = main.children[middleIndex];
        const targetCell = main.children[targetIndex];

        if (middleCell.firstChild &&
            middleCell.firstChild.classList.contains(pieceColor === 'black' ? 'white' : 'black') &&
            !targetCell.firstChild) {
            return true;
        }
    }

    // Additional check for kings
    if (isKing) {
        const kingDirections = [
            { dRow: 1, dCol: 1 },
            { dRow: 1, dCol: -1 },
            { dRow: -1, dCol: 1 },
            { dRow: -1, dCol: -1 }
        ];

        for (const { dRow, dCol } of kingDirections) {
            for (let distance = 2; distance < 8; distance++) {
                const targetRow = row + distance * dRow;
                const targetCol = col + distance * dCol;
                if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) break;

                let capturedPieceIndex = -1;

                for (let i = 1; i < distance; i++) {
                    const intermediateRow = row + i * dRow;
                    const intermediateCol = col + i * dCol;
                    const intermediateIndex = intermediateRow * 8 + intermediateCol;
                    const intermediateCell = main.children[intermediateIndex];
                    const intermediatePiece = intermediateCell.firstChild;

                    if (intermediatePiece) {
                        if (intermediatePiece.classList.contains(pieceColor === 'black' ? 'white' : 'black')) {
                            if (capturedPieceIndex === -1) {
                                capturedPieceIndex = intermediateIndex; // Opponent's piece found
                            } else {
                                capturedPieceIndex = -1; // More than one piece in the way, cannot capture
                                break;
                            }
                        } else {
                            capturedPieceIndex = -1; // Own team's piece in the way, cannot capture
                            break;
                        }
                    }
                }

                if (capturedPieceIndex !== -1) {
                    return true;
                }
            }
        }
    }

    return false;
}

// Functie om alle mogelijke moves te highlighten
function highlightMoves(cell) {
    const pieceColor = selectedPiece.classList.contains('black') ? 'black' : 'white';
    const isKing = selectedPiece.classList.contains('king');
    const cellIndex = Array.from(main.children).indexOf(cell);
    const row = Math.floor(cellIndex / 8);
    const col = cellIndex % 8;

    // Check alle mogelijke bewegingen
    const directions = [
        { dRow: 1, dCol: 1 },
        { dRow: 1, dCol: -1 },
        { dRow: -1, dCol: 1 },
        { dRow: -1, dCol: -1 }
    ];

    for (const { dRow, dCol } of directions) {
        let targetRow = row + dRow;
        let targetCol = col + dCol;
        while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
            const targetIndex = targetRow * 8 + targetCol;
            const targetCell = main.children[targetIndex];

            if (!targetCell.firstChild && (isKing || isForwardMove(pieceColor, row, targetRow))) {
                targetCell.classList.add('highlight');
            } else if (targetCell.firstChild && targetCell.firstChild.classList.contains(pieceColor === 'black' ? 'white' : 'black')) {
                // Capture move
                const captureRow = targetRow + dRow;
                const captureCol = targetCol + dCol;
                if (captureRow >= 0 && captureRow < 8 && captureCol >= 0 && captureCol < 8) {
                    const captureIndex = captureRow * 8 + captureCol;
                    const captureCell = main.children[captureIndex];
                    if (!captureCell.firstChild) {
                        captureCell.classList.add('highlight');
                    }
                }
                break;
            } else {
                break;
            }

            if (!isKing) break; // Pieces die geen king zijn kunnen niet meerdere spaces skippen
            targetRow += dRow;
            targetCol += dCol;
        }
    }

    highlightedCells = document.querySelectorAll('.cell.highlight');
}

// Functie om alle highlighted cells te verwijderen
function clearHighlights() {
    highlightedCells.forEach(cell => cell.classList.remove('highlight'));
}

// Functie om te checken of de move naar voren gaat, zoals het hoort behalve als de piece king is
function isForwardMove(pieceColor, currentRow, targetRow) {
    return (pieceColor === 'black' && targetRow > currentRow) || (pieceColor === 'white' && targetRow < currentRow);
}

// Functie om van een piece naar een king te maken
function promoteToKing(cell, pieceColor) {
    const row = Math.floor(Array.from(main.children).indexOf(cell) / 8);
    if ((pieceColor === 'black' && row === 7) || (pieceColor === 'white' && row === 0)) {
        const piece = cell.firstChild;
        if (piece) {
            piece.classList.add('king');
            piece.style.backgroundColor = 'gold'; 
        }
    }
}

// Functie om te tonen wie aan het beurt is
function updateTurnDisplay() {
    currentPlayerDisplay.textContent = `Current turn: ${currentPlayer}`;
}

// Functie om beurten te wisselen
function switchTurn() {
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    updateTurnDisplay();

    if (aiMode && currentPlayer === 'white') {
        setTimeout(aiMove, 1000); // AI makes a move after a delay
    }
}

// Functie om game te starten
function startGame() {
    aiMode = (gameModeSelect.value === 'aiMode');
    createBoard();
}

// Functie om bord te resetten
function resetGame() {
    main.innerHTML = ''; // Leeg maken
    currentPlayer = 'black'; // Zwart aan zet
    createBoard();
}

// Functie om te checken of game klaar is of nie
function checkGameOver() {
    const blackPieces = document.querySelectorAll('.piece.black').length;
    const whitePieces = document.querySelectorAll('.piece.white').length;

    if (blackPieces === 0) {
        whiteWins++;
        alert('White wins!');
        updateLeaderboard();
        resetGame();
    } else if (whitePieces === 0) {
        blackWins++;
        alert('Black wins!');
        updateLeaderboard();
        resetGame();
    }
}

// Functies om leaderboard te udpaten
function updateLeaderboard() {
    document.getElementById('blackWins').textContent = `Black Wins: ${blackWins}`;
    document.getElementById('whiteWins').textContent = `White Wins: ${whiteWins}`;
}

// Event listeners for buttons
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

document.getElementById('startBtn').addEventListener('click', () => {
    const gameMode = gameModeSelect.value;
    gameModeSelect.style.display = 'none';
    document.querySelector('label[for="gameMode"]').style.display = 'none';
    startBtn.style.display = 'none'; // Verstop de start button
    
    if (gameMode === 'aiMode') {
        aiMode = true;
    }
    createBoard();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    gameModeSelect.style.display = 'inline';
    document.querySelector('label[for="gameMode"]').style.display = 'inline';
    startBtn.style.display = 'inline';
    aiMode = false;
});

function isCaptureMove(startCell, targetCell, color) {
    let enemyColor = color === 'white' ? 'black' : 'white';
    let midRow = (parseInt(startCell.dataset.row) + parseInt(targetCell.dataset.row)) / 2;
    let midCol = (parseInt(startCell.dataset.col) + parseInt(targetCell.dataset.col)) / 2;
    let midCell = document.querySelector(`[data-row='${midRow}'][data-col='${midCol}']`);
    return midCell && midCell.firstChild && midCell.firstChild.classList.contains(`piece ${enemyColor}`);
}

// Leaderbord aan start
updateLeaderboard();