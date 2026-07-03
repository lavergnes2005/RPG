// ---------- Chlora Quest ----------
// A small FF6-style RPG vertical slice: overworld exploration + turn-based battles.

const TILE = 48;
const MAP_COLS = 14;
const MAP_ROWS = 10;

// 0 = grass, 1 = tree (blocked), 2 = path, 3 = encounter zone (tall grass)
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,2,2,2,0,0,3,3,0,0,1],
  [1,0,0,0,2,0,2,0,3,3,3,3,0,1],
  [1,0,1,0,2,0,2,0,3,3,3,3,0,1],
  [1,0,1,0,2,0,2,0,0,3,3,0,0,1],
  [1,0,0,0,2,2,2,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,2,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,2,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const TILE_COLORS = {
  0: 0x3a6b35, // grass
  1: 0x1f3d1c, // tree
  2: 0x8a6b4a, // path
  3: 0x4f8a3d, // tall grass (encounter zone)
};

class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  init(data) {
    this.party = data.party || {
      name: 'Ryn',
      hp: 32, maxHp: 32,
      mp: 12, maxMp: 12,
      atk: 7,
    };
  }

  create() {
    this.moving = false;
    this.playerTile = { x: 2, y: 2 };

    // Draw map
    this.tileGroup = this.add.group();
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const tileType = MAP[y][x];
        const rect = this.add.rectangle(
          x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2,
          TILE_COLORS[tileType]
        );
        rect.tileType = tileType;
      }
    }

    // Player sprite (simple colored circle w/ direction marker)
    this.player = this.add.container(
      this.playerTile.x * TILE + TILE / 2,
      this.playerTile.y * TILE + TILE / 2
    );
    const body = this.add.circle(0, 0, TILE / 3, 0xffcc66);
    const marker = this.add.triangle(0, -TILE / 4, 0, 8, -6, -6, 6, -6, 0xffffff);
    this.player.add([body, marker]);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.hintText = this.add.text(8, MAP_ROWS * TILE + 6,
      'Arrow keys / WASD to move. Walk into tall grass to trigger a battle.',
      { fontSize: '14px', color: '#cccccc' }
    );

    this.stepsSinceEncounter = 0;
  }

  isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || ty >= MAP_ROWS || tx >= MAP_COLS) return true;
    return MAP[ty][tx] === 1;
  }

  update() {
    if (this.moving) return;

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    if (dx === 0 && dy === 0) return;

    const newX = this.playerTile.x + dx;
    const newY = this.playerTile.y + dy;
    if (this.isBlocked(newX, newY)) return;

    this.moving = true;
    this.playerTile = { x: newX, y: newY };

    this.tweens.add({
      targets: this.player,
      x: newX * TILE + TILE / 2,
      y: newY * TILE + TILE / 2,
      duration: 160,
      onComplete: () => {
        this.moving = false;
        this.checkEncounter(newX, newY);
      },
    });
  }

  checkEncounter(x, y) {
    if (MAP[y][x] !== 3) return;
    this.stepsSinceEncounter++;
    // ~25% chance per step in tall grass, guaranteed after 6 safe steps
    if (Math.random() < 0.25 || this.stepsSinceEncounter >= 6) {
      this.stepsSinceEncounter = 0;
      this.scene.start('Battle', { party: this.party });
    }
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.party = data.party;
    this.enemy = {
      name: 'Cave Slime',
      hp: 20, maxHp: 20,
      atk: 4,
    };
    this.playerTurn = true;
    this.battleOver = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#150e2b');

    this.add.text(20, 20, 'BATTLE', { fontSize: '22px', color: '#ffcc66' });

    // Enemy display
    this.add.circle(500, 140, 44, 0x5b2a86);
    this.enemyNameText = this.add.text(440, 200, '', { fontSize: '16px', color: '#ffffff' });
    this.enemyHpText = this.add.text(440, 220, '', { fontSize: '14px', color: '#ff8080' });

    // Party display
    this.add.circle(120, 140, 36, 0xffcc66);
    this.partyNameText = this.add.text(70, 200, '', { fontSize: '16px', color: '#ffffff' });
    this.partyHpText = this.add.text(70, 220, '', { fontSize: '14px', color: '#80ff80' });
    this.partyMpText = this.add.text(70, 240, '', { fontSize: '14px', color: '#80c0ff' });

    this.logText = this.add.text(20, 280, 'A wild Cave Slime appears!', {
      fontSize: '16px', color: '#eeeeee', wordWrap: { width: 560 },
    });

    // Menu
    this.menuItems = ['Attack', 'Fire', 'Potion', 'Run'];
    this.menuTexts = [];
    this.selectedIndex = 0;

    this.menuItems.forEach((label, i) => {
      const t = this.add.text(20, 340 + i * 28, label, {
        fontSize: '18px', color: '#ffffff',
      });
      this.menuTexts.push(t);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.updateUI();
  }

  updateUI() {
    this.enemyNameText.setText(this.enemy.name);
    this.enemyHpText.setText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`);
    this.partyNameText.setText(this.party.name);
    this.partyHpText.setText(`HP: ${this.party.hp}/${this.party.maxHp}`);
    this.partyMpText.setText(`MP: ${this.party.mp}/${this.party.maxMp}`);

    this.menuTexts.forEach((t, i) => {
      t.setColor(i === this.selectedIndex ? '#ffcc66' : '#ffffff');
      t.setText((i === this.selectedIndex ? '> ' : '  ') + this.menuItems[i]);
    });
  }

  log(msg) {
    this.logText.setText(msg);
  }

  update() {
    if (this.battleOver || !this.playerTurn) return;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex = (this.selectedIndex + this.menuItems.length - 1) % this.menuItems.length;
      this.updateUI();
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
      this.updateUI();
    } else if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.handleAction(this.menuItems[this.selectedIndex]);
    }
  }

  handleAction(action) {
    if (action === 'Attack') {
      const dmg = Phaser.Math.Between(this.party.atk - 2, this.party.atk + 2);
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      this.log(`${this.party.name} attacks for ${dmg} damage!`);
    } else if (action === 'Fire') {
      if (this.party.mp < 4) {
        this.log('Not enough MP!');
        this.updateUI();
        return;
      }
      this.party.mp -= 4;
      const dmg = Phaser.Math.Between(8, 14);
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      this.log(`${this.party.name} casts Fire for ${dmg} damage!`);
    } else if (action === 'Potion') {
      const heal = 15;
      this.party.hp = Math.min(this.party.maxHp, this.party.hp + heal);
      this.log(`${this.party.name} drinks a potion, recovering ${heal} HP!`);
    } else if (action === 'Run') {
      this.log('Got away safely!');
      this.updateUI();
      this.battleOver = true;
      this.time.delayedCall(1000, () => this.scene.start('World', { party: this.party }));
      return;
    }

    this.updateUI();

    if (this.enemy.hp <= 0) {
      this.log(`${this.enemy.name} was defeated! Victory!`);
      this.battleOver = true;
      this.time.delayedCall(1400, () => this.scene.start('World', { party: this.party }));
      return;
    }

    this.playerTurn = false;
    this.time.delayedCall(900, () => this.enemyTurn());
  }

  enemyTurn() {
    const dmg = Phaser.Math.Between(this.enemy.atk - 1, this.enemy.atk + 2);
    this.party.hp = Math.max(0, this.party.hp - dmg);
    this.log(`${this.enemy.name} attacks for ${dmg} damage!`);
    this.updateUI();

    if (this.party.hp <= 0) {
      this.log(`${this.party.name} was defeated... Game over.`);
      this.battleOver = true;
      this.time.delayedCall(1600, () => {
        this.party.hp = this.party.maxHp;
        this.party.mp = this.party.maxMp;
        this.scene.start('World', { party: this.party });
      });
      return;
    }

    this.playerTurn = true;
  }
}

const config = {
  type: Phaser.AUTO,
  width: MAP_COLS * TILE,
  height: MAP_ROWS * TILE + 40,
  parent: 'game-container',
  backgroundColor: '#0a0a14',
  scene: [WorldScene, BattleScene],
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
