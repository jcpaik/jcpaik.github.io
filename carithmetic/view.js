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
            this.equation.innerHTML = '이겼습니다!';
            if (this.onWon !== null) {
                this.onWon();
            }
        } else if (this.game.status === Lost) {
            this.equation.innerHTML = '다시!';
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
        title: "1. 더하기",
        deck: [[2, 5], ['+'], [7, 4], ['=']],
        goal: {
            description: "10 이상의 수를 만드세요",
            check: x => x >= 10
        },
    },
    {
        title: "2. 빼기",
        deck: [[8, 4], ['-'], [2, '(-9)'], ['=']],
        goal: {
            description: "15 이상의 수를 만드세요",
            check: x => x >= 15
        },
    },
    {
        title: "3. 더하기 또는 빼기",
        deck: [[4, 2], ['+', '-'], [4, '(-3)'], ['+', '-'], [2, '(-5)'], ['=']],
        goal: {
            description: "13 이상의 수를 만드세요",
            check: x => x >= 13
        },
    },
    {
        title: "4. 음수 곱하기 음수",
        deck: [[-5, 3], ['*'], [4, -6], ['=']],
        goal: {
            description: "20 이상의 수를 만드세요",
            check: x => x >= 20
        },
    },
    {
        title: "5. 음수 곱하기 음수 곱하기 음수?",
        deck: [['(-3)', 2], ['*'], [4, '(-3)'], ['*'], [5, '(-4)'], ['=']],
        goal: {
            description: "45 초과의 수를 만드세요",
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
        view.equation.innerHTML = '게임을 다 깼습니다! 🎂'
    }
}
async function onLost() {
    await sleep(1200);
    view.loadLevel(levels[level]);
}
view.onWon = onWon;
view.onLost = onLost;