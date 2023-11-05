function Stacker() {
  var EMPTY = 0,
    WALL = 1,
    BLOCK = 2,
    GOLD = 3;

  this.hasBlock = false;
  this.location = [16, 16];
  this.turns = 0;
  this.gold = [-1, -1];
  this.staircase = [];
  this.prev = null;
  this.phase = 1;
  this.blocks = new ArraySet();
  this.turnQueue = [];

  // 33 x 33 coordinate map to allow for us starting at any origin
  this.caveMap = [];
  for (let i = 0; i < 33; i++) {
    this.caveMap.push(new Array(33).fill("-"));
  }

  // take in specific coordinates and value at the location, update map
  this.updateCoordinate = function (x, y, cell) {
    // console.log(x,y,cell)
    const { level, type } = cell;
    if (type === 0) {
      this.caveMap[y][x] = 0;
    } else if (type === 1) {
      if (this.caveMap[y][x] !== 9) {
        this.caveMap[y][x] = 9;
        console.log(x,y)
      }
    } else if (type === 2) {
      this.caveMap[y][x] = level;
      if (this.phase === 1 && !this.blocks.has([x, y])) {
        this.blocks.add([x, y]);
      }
    } else if (type === 3) {
      this.caveMap[y][x] = 8;
      if (this.gold[0] === -1) {
        this.gold = [x, y];
      }
    }
  };

  // calc turns to get from current location to the next block
  this.pathToNextBlock = function () {};

  // determine progress on staircase, chart path to start of staircase and then to whatever step needs the next block
  this.pathToStaircase = function () {};

  this.pathToCoords = function (map, start, target) {
    console.log(map)
    this.printMap()
    console.log(start)
    console.log(target)
    // const rows = coordinateMap.length;
    // const cols = coordinateMap[0].length;

    // Define possible directions: up, down, left, right
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    // Helper function to check if a cell is valid (within map bounds and not a wall)
    function isValidCell(y, x) {
      return map[y][x] !== 9 || map[y][x] !== "-";
    }

    // Helper function to perform DFS to find a path
    function dfs(y, x) {
      if (y === target[0] && x === target[1]) {
        return true; // Found the target
      }

      map[y][x] = 9; // Mark as visited to avoid revisiting

      for (const [dr, dc] of directions) {
        const newY = y + dr;
        const newX = x + dc;

        if (isValidCell(newY, newX)) {
          if (dfs(newY, newX)) {
            // Recursively found a path
            return true;
          }
        }
      }

      return false; // No path found from this cell
    }

    // Call the DFS function from the start position
    if (
      isValidCell(start[0], start[1]) &&
      dfs(start[0], start[1])
    ) {
      // Initialize the path and backtrack to construct it
      const path = [];
      let [y, x] = target;

      while (!(y === start[0] && x === start[1])) {
        path.unshift([y, x]);
        for (const [dr, dc] of directions) {
          const newY = y + dr;
          const newX = x + dc;
          if (isValidCell(newY, newX) && map[newY][newX] === 9) {
            y = newY;
            x = newX;
            break;
          }
        }
      }

      path.unshift(start);
      return path;
    } else {
      return null; // No path found
    }
  };

  // call updateCoordinate on all surrounding cells and current cell
  this.updateMap = function (cell) {
    const { level, type, left, right, up, down } = cell;
    this.updateCoordinate(this.location[0], this.location[1], { level, type });
    this.updateCoordinate(this.location[0] + 1, this.location[1], right);
    this.updateCoordinate(this.location[0] - 1, this.location[1], left);
    this.updateCoordinate(this.location[0], this.location[1] - 1, up);
    this.updateCoordinate(this.location[0], this.location[1] + 1, down);
  };

  // check if conditions for phase 2 are met
  // if they are, setup staircase plan
  this.countBlocks = function () {
    if (this.blocks.size > 28 && this.gold[0] !== -1) {
      console.log("*********PHASE 2**********");
      const goldXY = [...this.gold];
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
      // this.printMap();
      this.phase = 2;
      console.log(this.pathToCoords(this.caveMap, this.location, [goldXY[0] + 1, goldXY[1]]));
    }
  };

  // legibly print map in console
  this.printMap = function () {
    console.log("-----Turns: " + this.turns)
    // copy[this.location[1]][this.location[0]] = "X";
    for (let i = 0; i < 33; i++) {
      console.log(this.caveMap[i].join("   "));
    }
  };

  // magic
  // two sets of instructions, one for phase 1 and one for phase 2
  this.turn = function (cell) {
    // update turns and map on every turn
    this.updateMap(cell);
    // if (this.turns % 10 == 0) {
    //   console.log("*****TURNS: " + this.turns)
    //   this.printMap()
    // }
    this.turns++;

    // check to see if we should move to phase 2 before proceeding
    if (this.phase === 1) this.countBlocks();

    // phase 1: Randomly move until cave sufficienty explored to reveal gold and 28 blocks
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

    // phase 2: build staircase
    else if (this.phase === 2) {
      if (this.turnQueue.length === 0) {
        if (this.hasBlock) {
          // chart course to staircase
        } else {
          // chart course to block
        }
      }
      return this.turnQueue.unshift();
    }
  };

  this.up = function () {
    this.location[1] = this.location[1] - 1;
    this.prev = "down";
    // if (this.turns % 100 === 0) {
    //   this.printMap();
    // }
    return "up";
  };
  this.down = function () {
    this.location[1] = this.location[1] + 1;
    this.prev = "up";
    // if (this.turns % 100 === 0) {
    //   this.printMap();
    // }
    return "down";
  };
  this.left = function () {
    this.prev = "right";
    this.location[0] = this.location[0] - 1;
    // if (this.turns % 100 === 0) {
    //   this.printMap();
    // }
    return "left";
  };
  this.right = function () {
    this.prev = "left";
    this.location[0] = this.location[0] + 1;
    // if (this.turns % 100 === 0) {
    //   this.printMap();
    // }
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
}

class ArraySet extends Set {
  add(arr) {
    super.add(arr.toString());
  }
  has(arr) {
    return super.has(arr.toString());
  }
}
