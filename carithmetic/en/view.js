'use strict';

function replaceOperator(str) {
    let nstr = String(str).replace('*', '×').replace('/', '÷');
    return nstr;
}

function replaceCardOperator(str) {
    let nstr = String(str).replace('*', '×').replace('/', '÷');
    // TODO: take care of this ad-hoc removal of brackets
    if (nstr.length > 0 && nstr[0] == '(') {
        nstr = nstr.substring(1, nstr.length - 1);
    }
    return nstr.replace('=', '✔️');
}

class View {
    constructor() {
        this.title = document.getElementById('title');
        this.objective = document.getElementById('objective');
        this.cards = document.getElementById('cards');
        this.equation = document.getElementById('equation');

        this.onWon = null;
        this.onLost = null;
    }

    loadLevel(level) {
        this.game = new Game(level.deck, level.goal);
        this.title.innerHTML = level.title;
        this.objective.innerHTML = level.goal.description;
        this.updateStep();
    }

    updateStep() {
        if (this.game.status === Running) {
            this.drawCards(this.game.field);
            this.equation.innerHTML = replaceOperator(this.game.equation);
        } else if (this.game.status === Won) {
            this.equation.innerHTML = 'You won!';
            if (this.onWon !== null) {
                this.onWon();
            }
        } else if (this.game.status === Lost) {
            this.equation.innerHTML = 'Try again!';
            if (this.onLost !== null) {
                this.onLost();
            }
        }
    }

    selectCard(i) {
        this.game.chooseCard(i);
        this.updateStep();
    }

    drawCards(cards) {
        this.cards.innerHTML = "";
        cards.forEach((c, i) => {
            const flexbox = document.createElement('div');
            flexbox.className = "flexbox";
            const card = document.createElement('div');
            card.className = "card";
            card.innerHTML = replaceCardOperator(c);
            flexbox.appendChild(card);
            this.cards.appendChild(flexbox);
            const cardOnclick = this.selectCard.bind(this);
            card.onclick = function() {
                cardOnclick(i);
            }
        });
    }
}

const levels = [
    {
        title: "1. Addition",
        deck: [[2, 5], ['+'], [7, 4], ['=']],
        goal: {
            description: "Make a number at least 10",
            check: x => x >= 10
        },
    },
    {
        title: "2. Subtraction",
        deck: [[8, 4], ['-'], [2, '(-9)'], ['=']],
        goal: {
            description: "Make a number at least 15",
            check: x => x >= 15
        },
    },
    {
        title: "3. Addition and subtraction",
        deck: [[4, 2], ['+', '-'], [4, '(-3)'], ['+', '-'], [2, '(-5)'], ['=']],
        goal: {
            description: "Make a number at least 13",
            check: x => x >= 13
        },
    },
    {
        title: "4. Multiplying negative numbers",
        deck: [[-5, 3], ['*'], [4, -6], ['=']],
        goal: {
            description: "Make a number at least 20",
            check: x => x >= 20
        },
    },
    {
        title: "5. Lots of multiplications",
        deck: [['(-3)', 2], ['*'], [4, '(-3)'], ['*'], [5, '(-4)'], ['=']],
        goal: {
            description: "Make a number greater than 45",
            check: x => x > 45
        },
    },
];

let level = 0;
const view = new View();
view.loadLevel(levels[level]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function onWon() {
    await sleep(1200);
    if (level < levels.length - 1) {
        level++;
        view.loadLevel(levels[level]);
    } else {
        view.equation.innerHTML = 'You finished the game. Here's a cake! 🎂'
    }
}
async function onLost() {
    await sleep(1200);
    view.loadLevel(levels[level]);
}
view.onWon = onWon;
view.onLost = onLost;
