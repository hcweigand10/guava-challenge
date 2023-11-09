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
  this.staircaseStart = [-1, -1];
  this.prev = [-1, -1];
  this.prevMove = "";
  this.phase = 1;
  this.blocks = new ArraySet();
  this.turnQueue = [];
  this.visitedCells = new Set();
  this.nextBlock = [-1,-1]

  // 33 x 33 coordinate map to allow for us starting at any origin
  this.caveMap = [];
  for (let i = 0; i < 33; i++) {
    this.caveMap.push(new Array(33).fill("-"));
  }

  this.checkIfInStaircase = function (coords) {
    if (coords[0] + 1 === this.gold[0] && coords[1] + 1 === this.gold[1]) return false
    if (Math.abs(coords[0] - this.gold[0]) < 2 && Math.abs(coords[1] - this.gold[1]) < 2) return true
    return false
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
        // console.log(x,y)
      }
    } else if (type === 2) {
      if (this.caveMap[y][x] !== level) {
        if (!this.checkIfInStaircase([x,y])) {
          console.log("new block:")
          console.log(x,y)
          console.log(this.blocks.has([x,y]))
        }
      }
      this.caveMap[y][x] = level;
      if (this.phase === 1) {
        this.blocks.add([x,y])
      } else if (this.phase === 2) {
        // don't add if the block is in the staircase
        // if ((Math.abs(x - this.gold[0]) > 1) || (Math.abs(y - this.gold[1]) > 1)) {
          // don't add if the block is the one we are about to pickup
          // if (this.nextBlock[0] !== x && this.nextBlock[1] !== y) {
          //   const oldSize = this.blocks.size
          //   this.blocks.add([x,y])
          //   if (this.blocks.size > oldSize) {
          //     console.log("addededd")
          //     console.log(x,y)
          //   }
          // }
        // }
        if (!this.checkIfInStaircase([x,y])) {
          this.blocks.add([x,y])
        }
      }
    } else if (type === 3) {
      if (this.gold[0] === -1) {
        this.foundGold(x, y);
      }
    }
  };

  // mark location of gold and then queue up the turns required to circle the tower, just to ensure the staircase locations are mapped
  this.foundGold = function (x, y) {
    console.log("Found Gold!");
    console.log([x, y]);
    this.caveMap[y][x] = 8;
    this.gold = [x, y];
    if (x === this.location[0] + 1) {
      this.turnQueue.push(
        "up",
        "right",
        "right",
        "down",
        "down",
        "left",
        "left"
      );
    } else if (x === this.location[0] - 1) {
      this.turnQueue.push(
        "up",
        "left",
        "left",
        "down",
        "down",
        "right",
        "right"
      );
    } else if (y === this.location[1] + 1) {
      this.turnQueue.push("right", "down", "down", "left", "left", "up", "up");
    } else if (y === this.location[1] - 1) {
      this.turnQueue.push("right", "up", "up", "left", "left", "down", "down");
    }
  };

  // calc turns to get from current location to the next block
  this.pathToNextBlock = function () {};

  // determine progress on staircase, chart path to start of staircase and then to whatever step needs the next block
  this.pathToStaircase = function () {};

  this.pathToCoords = function (start, target) {
    // console.log("Start:");
    // console.log(start);
    // console.log("Target:");
    // console.log(target);

    const directions = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    const startSquare = {
      coords: start,
      path: [],
    };

    const queue = [startSquare];

    while (queue.length > 0) {
      const currentLocation = queue.shift();

      for (const direction of directions) {
        const newLocation = [
          currentLocation.coords[0] + direction[0],
          currentLocation.coords[1] + direction[1],
        ];
        if (target[0] === newLocation[0] && target[1] === newLocation[1]) {
          this.resetMap();
          return [...currentLocation.path, newLocation];
        }
        if (this.isValidSquare(newLocation[0], newLocation[1])) {
          queue.push({
            coords: newLocation,
            path: [...currentLocation.path, newLocation],
          });
        }
      }
    }
    // return null if no path possible
    // should never reach here, ever path should be possible
    this.resetMap();
    return null;
  };

  this.isValidSquare = function (x, y) {
    if (this.caveMap[y][x] === 1) {
      // mark as visited block
      this.caveMap[y][x] = 11;
      return true;
    } else if (this.caveMap[y][x] === 0) {
      // mark as visited empty space
      this.caveMap[y][x] = 10;
      return true;
    } else {
      return false;
    }
  };

  // call updateCoordinate on all surrounding cells and current cell
  this.updateMap = function (cell) {
    this.visitedCells.add(`${this.location[0]},${this.location[1]}`);
    const { level, type, left, right, up, down } = cell;
    this.updateCoordinate(this.location[0], this.location[1], { level, type });
    this.updateCoordinate(this.location[0] + 1, this.location[1], right);
    this.updateCoordinate(this.location[0] - 1, this.location[1], left);
    this.updateCoordinate(this.location[0], this.location[1] - 1, up);
    this.updateCoordinate(this.location[0], this.location[1] + 1, down);
  };

  // check if conditions for phase 2 are met
  // if they are, setup staircase plan, filter blocks already in staircase from list of blocks to gather
  this.countBlocks = function () {
    if (
      this.blocks.size > 28 &&
      this.gold[0] !== -1 &&
      this.turnQueue.length === 0
    ) {
      console.log("*********PHASE 2**********");
      console.log(Array.from(this.blocks))
      const goldXY = [...this.gold];
      // mark where staircase will begin, this will be our reference point for building
      this.staircaseStart = [this.gold[0], this.gold[1] - 1];
      this.genStaircase();
      this.printMap();
      // filter out blocks next to gold from the list of blocks to be gathered
      this.blocks = new ArraySet(Array.from(this.blocks)
        .map((block) => block.split(",").map((coord) => parseInt(coord)))
        .filter(
          (block) => !this.checkIfInStaircase(block)
        ))
      this.phase = 2;
    }
  };

  // legibly print map in console
  this.printMap = function (map) {
    console.log("-----Turns: " + this.turns);
    // copy[this.location[1]][this.location[0]] = "X";
    for (let i = 0; i < 33; i++) {
      var row = "";
      for (let j = 0; j < 33; j++) {
        const ele = this.caveMap[i][j];
        if (i === this.location[1] && j === this.location[0]) {
          row += "X";
        } else {
          row += ele;
        }
        row += "   ";
      }
      console.log(row);
    }
    console.log("gold:");
    console.log(this.gold);
    console.log("Current Location:");
    console.log(this.location);
    console.log("Blocks");
    console.log(this.blocks);

  };

  // reset all of the visited coordinates
  this.resetMap = function () {
    for (let i = 0; i < 33; i++) {
      for (let j = 0; j < 33; j++) {
        if (this.caveMap[i][j] === 11) {
          this.caveMap[i][j] = 1;
        } else if (this.caveMap[i][j] === 10) {
          this.caveMap[i][j] = 0;
        }
      }
    }
  };

  this.calcNextNeededStair = function () {
    const fullClimb = ["right", "down", "down", "left", "left", "up"];
    let step = 0;
    while (step < 6) {
      const stair = this.staircase[step];
      const nextStair = this.staircase[step + 1];
      if (
        this.caveMap[stair.loc[1]][stair.loc[0]] < stair.neededHeight &&
        this.caveMap[nextStair.loc[1]][nextStair.loc[0]] ===
          this.caveMap[stair.loc[1]][stair.loc[0]] + 1
      ) {
        break;
      }
      step++;
    }
    // this.updateStaircase()
    // this.staircase[step].currHeight += 1
    const path = fullClimb.slice(0, step);
    return path;
  };

  this.genStaircase = function () {
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
  };

  this.flipAndReversePath = function (path) {
    return path.reverse().map((x) => this.flipTurn(x));
  };

  this.flipTurn = function (turn) {
    if (turn === "down") return "up";
    if (turn === "up") return "down";
    if (turn === "left") return "right";
    if (turn === "right") return "left";
    if (turn === "pickup") return "drop";
    if (turn === "drop") return "pickup";
  };

  // magic
  // two sets of instructions, one for phase 1 and one for phase 2
  this.turn = function (cell) {
    // trouble is afoot if location doesnt change AND block is not picked up or dropped
    if (
      this.prev[0] === this.location[0] &&
      this.prev[1] === this.location[1] &&
      this.prevMove !== "pickup" &&
      this.prevMove !== "drop"
    ) {
      console.log("uh oh, failed move");
      console.log(this.prev);
      console.log(this.prevMove);
    }
    // track prev square
    this.prev = [...this.location];
    // update turns and map on every turn
    this.updateMap(cell);
    this.turns++;

    // check to see if we should move to phase 2 before proceeding
    if (this.phase === 1) this.countBlocks();

    // phase 1: Randomly move until cave sufficienty explored to reveal gold and 28 blocks
    if (this.phase == 1) {
      if (this.turnQueue.length > 0) {
        const nextTurn = this.turnQueue.shift();
        if (nextTurn === "up") return this.up();
        if (nextTurn === "down") return this.down();
        if (nextTurn === "left") return this.left();
        if (nextTurn === "right") return this.right();
      }
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
        validDirections = validDirections.filter((x) => x !== this.flipTurn(x));
      }
      // if possible to continue in straight line, tend to do so 75% of the time
      // 100% might cause ping-pong between dead ends
      if (validDirections.includes(this.prevMove)) {
        if (Math.random() > 0.3) {
          validDirections = [this.prevMove];
        }
      }
      const n = (Math.random() * validDirections.length) >> 0;
      if (validDirections[n] === "left") return this.left();
      if (validDirections[n] === "right") return this.right();
      if (validDirections[n] === "up") return this.up();
      if (validDirections[n] === "down") return this.down();
    }

    // phase 2: build staircase
    else if (this.phase === 2) {
      if (this.caveMap[this.gold[1]][this.gold[0]-1] === 8) {
        this.printMap()
      }
      if (this.turnQueue.length === 0) {
        if (this.hasBlock) {
          // build next stair in staircase and then return to staircase start
          const pathToNextStair = this.calcNextNeededStair();
          this.turnQueue = this.turnQueue.concat(pathToNextStair);
          this.turnQueue.push("drop");
          this.turnQueue = this.turnQueue.concat(
            this.flipAndReversePath(pathToNextStair)
          );
        } else {
          // chart course to block and course back
          // convert set of known blocks into array
          const blockCoordsArray = Array.from(this.blocks).map((block) =>
            block.split(",").map((coord) => parseInt(coord))
          );
          // sort array by distance to gold
          blockCoordsArray.sort(
            (a, b) => this.calcDistanceToGold(a) - this.calcDistanceToGold(b)
          );
          this.nextBlock = blockCoordsArray[0];
          const pathToBlock = this.pathToCoords(this.location, this.nextBlock);
          const turns = this.convertPathToTurns(pathToBlock, this.location);
          this.turnQueue = this.turnQueue.concat(turns);
          this.turnQueue.push("pickup");
          // if at staircase start, just reverse path to get back
          if (
            this.location[0] === this.staircaseStart[0] &&
            this.location[1] === this.staircaseStart[1]
          ) {
            this.turnQueue = this.turnQueue.concat(
              this.flipAndReversePath(turns)
            );
          }
          // else, calc path back to staircase
          else {
            const pathBack = this.pathToCoords(this.nextBlock, this.staircaseStart);
            const turns = this.convertPathToTurns(pathBack, this.nextBlock);
            this.turnQueue = this.turnQueue.concat(turns);
          }
          this.blocks.delete(this.nextBlock)
          
        }
      }
      // refactor (duplicates)
      const nextTurn = this.turnQueue.shift();
      if (nextTurn === "up") return this.up();
      if (nextTurn === "down") return this.down();
      if (nextTurn === "left") return this.left();
      if (nextTurn === "right") return this.right();
      if (nextTurn === "pickup") {
        if (cell.type !== 2) {
          console.log("Trying to pickup empty cell!");
          console.log(this.location);
        }
        return this.pickup();
      }
      if (nextTurn === "drop") return this.drop();
    }
  };

  // convert coordinate path in array of string moves by comparing each square to prev square
  this.convertPathToTurns = function (path, prevBlock) {
    const turns = path.map((coords, index) => {
      if (index > 0) {
        prevBlock = path[index - 1];
      }
      if (prevBlock[0] + 1 === coords[0]) return "right";
      if (prevBlock[0] - 1 === coords[0]) return "left";
      if (prevBlock[1] + 1 === coords[1]) return "down";
      if (prevBlock[1] - 1 === coords[1]) return "up";
    });
    return turns;
  };

  this.calcDistanceToGold = function (coords) {
    return (
      Math.abs(this.staircaseStart[0] - coords[0]) + Math.abs(this.staircaseStart[1] - coords[1])
    );
  };

  this.up = function () {
    this.location[1] = this.location[1] - 1;
    this.prevMove = "up";
    return "up";
  };
  this.down = function () {
    this.location[1] = this.location[1] + 1;
    this.prevMove = "down";
    return "down";
  };
  this.left = function () {
    this.prevMove = "left";
    this.location[0] = this.location[0] - 1;
    return "left";
  };
  this.right = function () {
    this.prevMove = "right";
    this.location[0] = this.location[0] + 1;
    return "right";
  };

  this.pickup = function () {
    this.prevMove = "pickup";
    this.blocks.delete(this.location)
    this.hasBlock = true;
    return "pickup";
  };

  this.drop = function () {
    this.prevMove = "drop";
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

  delete(arr) {
    super.delete(arr.toString());
  }
}
