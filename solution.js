function Stacker() {
  var EMPTY = 0,
    WALL = 1,
    BLOCK = 2,
    GOLD = 3;

  this.hasBlock = false;
  this.location = [15, 15];
  this.turns = 0;
  this.gold = [-1, -1];
  this.staircase = [];
  this.prev = null;
  this.phase = 1;
  this.blocks = new Set();

  // 31 x 31 coordinate map to allow for us starting at any origin
  this.caveMap = [];
  for (let i = 0; i < 31; i++) {
    this.caveMap.push(new Array(31).fill("-"));
  }

  this.updateCoordinate = function (x, y, cell) {
    // console.log(x,y,cell)
    const { level, type } = cell;
    if (type === 0) {
      this.caveMap[y][x] = 0;
    } else if (type === 1) {
      this.caveMap[y][x] = 9;
    } else if (type === 2) {
      this.caveMap[y][x] = level;
      if (this.phase === 1) {
        this.blocks.add([x,y])
      }
    } else if (type === 3) {
      this.caveMap[y][x] = 8;
      if (this.gold[0] === -1) {
        this.gold = [x, y];
      }
    }
  };

  this.pathToNextBlock = function () {
    // calc turns to get from current location to the next block
  };

  this.updateMap = function (cell) {
    const { level, type, left, right, up, down } = cell;
    // compare new surroundings with map, add/update anything new
    this.updateCoordinate(this.location[0], this.location[1], { level, type });
    this.updateCoordinate(this.location[0] + 1, this.location[1], right);
    this.updateCoordinate(this.location[0] - 1, this.location[1], left);
    this.updateCoordinate(this.location[0], this.location[1] - 1, up);
    this.updateCoordinate(this.location[0], this.location[1] + 1, down);
  };

  this.countBlocks = function () {
    var count = this.caveMap.reduce(
      (acum, curr) => acum + curr.reduce((acum, curr) => curr === 1 ? acum + curr : acum)
    );
    if (count > 28 && this.gold[0] !== -1) {
      console.log("*********PHASE 2**********")
      const goldXY = [...this.gold];
      this.caveMap.forEach((row, i) => {
        row.forEach((val, j) => {
          if (val === 1) this.blocks.push()
        })
      });
      this.staircase = [
        {
          loc: [goldXY[0], goldXY[1] - 1],
          currHeight: this.caveMap[goldXY[1] - 1][goldXY[0]],
          neededHeight: 1,
        },
        {
          loc: [goldXY[0] + 1, goldXY[1] - 1],
          currHeight: this.caveMap[goldXY[1] - 1][goldXY[0] + 1],
          neededHeight: 2,
        },
        {
          loc: [goldXY[0] + 1, goldXY[1]],
          currHeight: this.caveMap[goldXY[1]][goldXY[0] + 1],
          neededHeight: 3,
        },
        {
          loc: [goldXY[0] + 1, goldXY[1] + 1],
          currHeight: this.caveMap[goldXY[1] + 1][goldXY[0] + 1],
          neededHeight: 4,
        },
        {
          loc: [goldXY[0], goldXY[1] + 1],
          currHeight: this.caveMap[goldXY[1] + 1][goldXY[0]],
          neededHeight: 5,
        },
        {
          loc: [goldXY[0] - 1, goldXY[1] + 1],
          currHeight: this.caveMap[goldXY[1] + 1][goldXY[0] - 1],
          neededHeight: 6,
        },
        {
          loc: [goldXY[0] - 1, goldXY[1]],
          currHeight: this.caveMap[goldXY[1]][goldXY[0] - 1],
          neededHeight: 7,
        },
        {
          loc: [goldXY[0], goldXY[1]],
          currHeight: this.caveMap[goldXY[1]][goldXY[0]],
          neededHeight: 9,
        },
      ];

      this.phase = 2;
    }
  };

  this.printMap = function () {
    const copy = [...this.caveMap];
    copy[this.location[1]][this.location[0]] = "X";
    for (let i = 0; i < 31; i++) {
      console.log(copy[i].join(" "));
    }
    console.log(this.gold);
    console.log(this.location);
  };

  this.turn = function (cell) {
    this.turns++;
    this.updateMap(cell);
    if (this.phase == 1) {
      const { left, right, up, down, level } = cell;
      var validDirections = [];
      if (left.type !== 1 && Math.abs(left.level - level) < 2) {
        validDirections.push("left");
      }
      if (right.type !== 1 && Math.abs(right.level - level) < 2) {
        validDirections.push("right");
      }
      if (up.type !== 1 && Math.abs(up.level - level) < 2) {
        validDirections.push("up");
      }
      if (down.type !== 1 && Math.abs(down.level - level) < 2) {
        validDirections.push("down");
      }
      // remove the option that would take us back to previous square, unless that is only option
      if (validDirections.length > 1) {
        validDirections = validDirections.filter((x) => x !== this.prev);
      }
      const n = (Math.random() * validDirections.length) >> 0;
      if (validDirections[n] === "left") return this.left();
      if (validDirections[n] === "right") return this.right();
      if (validDirections[n] === "up") return this.up();
      if (validDirections[n] === "down") return this.down();
    }
  };

  this.up = function () {
    this.location[1] = this.location[1] - 1;
    this.prev = "down";
    if (this.turns % 100 === 0) {
      this.printMap();
    }
    return "up";
  };
  this.down = function () {
    this.location[1] = this.location[1] + 1;
    this.prev = "up";
    if (this.turns % 100 === 0) {
      this.printMap();
    }
    return "down";
  };
  this.left = function () {
    this.prev = "right";
    this.location[0] = this.location[0] - 1;
    if (this.turns % 100 === 0) {
      this.printMap();
    }
    return "left";
  };
  this.right = function () {
    this.prev = "left";
    this.location[0] = this.location[0] + 1;
    if (this.turns % 100 === 0) {
      this.printMap();
    }
    return "right";
  };

  this.pickup = function () {
    this.hasBlock = true;
    return "pickup";
  };

  this.drop = function () {
    this.hasBlock = false;
    return "drop";
  };

  // More wizardry here
}
