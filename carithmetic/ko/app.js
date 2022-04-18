'use strict';

const goal = {
    description: "20 이상의 수를 만드세요",
    check: x => x >= 20
};

const deck = [[-5, 3], ['*'], [4, -6], ['=']]

function isNumber(value) {
    return (typeof value === 'number');
}

// For in-game logic, always use characters in "+-*/=()" 
// (so e.g. no multiplication / division Unicode symbols) 
function isOperator(value) {
    return (typeof value === 'string') && 
        (value.length == 1) &&
        "+-*/=".includes(value);
}

const Running = Symbol("Game is running");
const Won = Symbol("Game is finished, and user won");
const Lost = Symbol("Game is finished, and user lost");

class Game {
    constructor(deck, goal) {
        this.deck = deck;
        this.goal = goal;
        this.round_num = deck.length;
        this.round_idx = 0;
        this.status = Running;
        // Pure expression the user got
        this.expression = "";
    }

    // User expression with equality information
    get equation() {
        if (this.expression === "") {
            return "";
        }

        const expr = this.expression;
        const lastChar = expr[expr.length - 1];
        if (isOperator(lastChar)) {
            return expr;
        } else {
            const result = eval(expr); // Might need revamping 
            return expr + ' = ' + result;
        }
    }

    // All cards on table
    get field() {
        if (this.status === Running) {
            return this.deck[this.round_idx];
        } else {
            return null;
        }
    }

    _onGameEnd() {
        const result = eval(this.expression);
        if (this.goal.check(result)) {
            this.status = Won;
        } else {
            this.status = Lost;
        }
    }

    // Choose i'th card from the field
    chooseCard(card_idx) {
        if (this.status !== Running) {
            return;
        }
        if (0 > card_idx || card_idx >= this.round_num) {
            return;
        }

        const card = this.field[card_idx];
        
        if (card === "=") {
            this._onGameEnd();
            return;
        } else if (card == "()") {
            this.expression = "(" + this.expression + ")";
        } else { // All arithmetic operators / numbers
            this.expression += card;
        }
        this.round_idx++;
    }
}

const g = new Game(deck, goal);