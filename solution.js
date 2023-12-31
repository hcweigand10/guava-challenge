class Stacker {
  constructor(x) {
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
    this.nextBlock = [-1, -1];
    this.fullClimb = ["right", "down", "down", "left", "left", "up"];
    this.mapSizeHistory = [0];
    this.lastExplore = 0;
    this.x = x

    // when exploring, this number dictates liklihood of continuing in straight line (when possible)
    this.exploreStraightFactor = 0.71;

    // 33 x 33 coordinate map to allow for us starting at any origin
    this.caveMap = [];
    for (let i = 0; i < 33; i++) {
      this.caveMap.push(new Array(33).fill("-"));
    }
  }

    // cue wizadry
    // two sets of instructions, one for phase 1 and one for phase 2
    turn (cell) {
      // update turns, previous location, and map on every turn
      this.turns++;
      this.updateMap(cell);
      this.prev = [...this.location];

      // check to see if we should move to phase 2 before proceeding
      if (this.phase === 1) this.checkPhase2();

      // PHASE 1: Randomly-ish move until cave sufficienty explored to reveal gold and 28 blocks
      if (this.phase == 1) {
        // if no moves in queue
        if (this.turnQueue.length === 0) {
          // compute valid options
          const { left, right, up, down, level } = cell;
          left.coords = [this.location[0] - 1, this.location[1]];
          right.coords = [this.location[0] + 1, this.location[1]];
          down.coords = [this.location[0], this.location[1] + 1];
          up.coords = [this.location[0], this.location[1] - 1];
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
            validDirections = validDirections.filter(
              (x) => x !== this.flipTurn(this.prevMove)
            );
          }
          // if possible to continue in straight line and the previous move revealed some map, do so
          // if prev move did not reveal any map, move straight *most of the time, avoiding unproductive movement
          if (validDirections.includes(this.prevMove)) {
            if (this.mapSizeHistory[this.turns] >
              this.mapSizeHistory[this.turns - 1] ||
              Math.random() < this.exploreStraightFactor) {
              validDirections = [this.prevMove];
            }
          }

          // from remaining options, choose one at random
          const n = (Math.random() * validDirections.length) >> 0;
          if (validDirections[n] === "left") this.turnQueue.push("left");
          if (validDirections[n] === "right") this.turnQueue.push("right");
          if (validDirections[n] === "up") this.turnQueue.push("up");
          if (validDirections[n] === "down") this.turnQueue.push("down");
        }
        // do next move in queue
        const nextTurn = this.turnQueue.shift();
        if (nextTurn === "up") return this.up();
        if (nextTurn === "down") return this.down();
        if (nextTurn === "left") return this.left();
        if (nextTurn === "right") return this.right();
      }


      // PHASE 2: build staircase
      else if (this.phase === 2) {
        if (this.turnQueue.length === 0) {
          // PHASE 2a: calc next stair and chart course to it
          if (this.hasBlock) {
            const nextStep = this.calcNextNeededStair();
            const pathToNextStair = this.pathToCoords(
              this.location,
              this.staircase[nextStep].loc
            );
            const turns = this.convertPathToTurns(pathToNextStair, this.location);
            this.turnQueue = this.turnQueue.concat(turns);
            this.turnQueue.push("drop");
            // add one step to the right to finish the game if final step is ready
            if (nextStep === 5) {
              if (this.caveMap[this.staircase[nextStep].loc[1]][this.staircase[nextStep].loc[0]] === 6)
                this.turnQueue.push("right");
            }
          } else {
            // PHASE 2b: chart course to nearest block
            // convert set of known blocks back into array
            const blockCoordsArray = this.blocks.toArray();
            // sort array by distance to gold
            blockCoordsArray.sort(
              (a, b) => this.calcDistanceToGold(a) - this.calcDistanceToGold(b)
            );
            // target closest block
            this.nextBlock = blockCoordsArray[0];
            const pathToBlock = this.pathToCoords(this.location, this.nextBlock);
            const turns = this.convertPathToTurns(pathToBlock, this.location);
            this.turnQueue = this.turnQueue.concat(turns);
            this.turnQueue.push("pickup");
          }
        }
        // once queue is built, start with the first move
        const nextTurn = this.turnQueue.shift();
        if (nextTurn === "up") return this.up();
        if (nextTurn === "down") return this.down();
        if (nextTurn === "left") return this.left();
        if (nextTurn === "right") return this.right();
        if (nextTurn === "pickup") return this.pickup();
        if (nextTurn === "drop") return this.drop();
      }
    };

    // check if conditions for phase 2 are met
    // if they are, setup staircase plan, filter blocks already in staircase from list of blocks to gather
    checkPhase2 () {
      if (this.blocks.size > 21 &&
        this.gold[0] !== -1 &&
        this.turnQueue.length === 0) {
        // mark where staircase will begin, this will be our reference point for building
        this.staircaseStart = [this.gold[0], this.gold[1] - 1];
        this.genStaircase();
        // this.printMap();
        // filter out blocks next to gold from the list of blocks to be gathered
        this.blocks = new ArraySet(
          this.blocks.toArray().filter((block) => !this.checkIfInStaircase(block))
        );
        this.phase = 2;
      }
    };

    // call updateCoordinate on all surrounding cells and current cell
    updateMap (cell) {
      // map size at this turn is equal map size from past turn, new squares will be counted in updateCoordinate()
      this.mapSizeHistory.push(this.mapSizeHistory[this.turns - 1]);
      const { level, type, left, right, up, down } = cell;
      this.updateCoordinate(this.location[0], this.location[1], { level, type });
      this.updateCoordinate(this.location[0] + 1, this.location[1], right);
      this.updateCoordinate(this.location[0] - 1, this.location[1], left);
      this.updateCoordinate(this.location[0], this.location[1] - 1, up);
      this.updateCoordinate(this.location[0], this.location[1] + 1, down);
    };

    // take in specific coordinates and value at the location, update map
    updateCoordinate (x, y, cell) {
      // if charting new territory, update map size for this turn
      if (this.caveMap[y][x] === "-") {
        this.mapSizeHistory[this.turns] += 1;
      }
      const { level, type } = cell;
      if (type === 0) {
        this.caveMap[y][x] = 0;
      } else if (type === 1) {
        if (this.caveMap[y][x] !== 9) {
          this.caveMap[y][x] = 9;
        }
      } else if (type === 2) {
        this.caveMap[y][x] = level;
        if (this.phase === 1) {
          this.blocks.add([x, y]);
        } else if (this.phase === 2) {
          // only add if not in staircase, we don't want those blocks in queue to be fetched
          if (!this.checkIfInStaircase([x, y])) {
            this.blocks.add([x, y]);
          }
        }
      } else if (type === 3) {
        if (this.gold[0] === -1) {
          this.foundGold(x, y);
        }
      }
    };

    // mark location of gold and then queue up the turns required to circle the tower, just to ensure the staircase locations are mapped
    foundGold (x, y) {
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

    // find a path to specified coordinates using simplified BFS approach
    pathToCoords (start, target) {
      // copy of map to mark with visited squares
      const copy = [];
      for (let i = 0; i < 33; i++) {
        copy.push([...this.caveMap[i]]);
      }
      const directions = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      // each square will take the form of an object like this
      const startSquare = {
        coords: start,
        path: [],
        height: copy[start[1]][start[0]],
      };
      // initialize queue with just our start square
      const queue = [startSquare];
      while (queue.length > 0) {
        // since were taking from the front of the queue, all nodes at a certain depth will be explored before searching the next distance.
        // LIFO/BFS also guarantees that we'll get the shortest path (unlike DFS)
        const currentLocation = queue.shift();
        // console.log(currentLocation)
        // for each cardinal direction, get new location
        for (const direction of directions) {
          const newLocation = [
            currentLocation.coords[0] + direction[0],
            currentLocation.coords[1] + direction[1],
          ];
          // first check if neighboring square is valid/traversible
          if (this.isValidSquare(
            newLocation[0],
            newLocation[1],
            currentLocation.height,
            copy
          )) {
            // next check if its the target
            if (target[0] === newLocation[0] && target[1] === newLocation[1]) {
              // return early with path
              this.resetMap();
              return [...currentLocation.path, newLocation];
            } else {
              // otherwise add valid locations to the queue
              queue.push({
                coords: newLocation,
                path: [...currentLocation.path, newLocation],
                height: copy[newLocation[1]][newLocation[0]] - 10,
              });
            }
          }
        }
      }
      // return null if no path possible
      // should never reach here, ever path will be possible
      this.resetMap();
      console.log("no path found");
      return null;
    };

    // check if square is traversible and univisted in this search, if it is return true AND mark as visited
    isValidSquare (x, y, height, copy) {
      const square = copy[y][x];
      if (square > 8 || square === "-") {
        return false;
      } else {
        if (Math.abs(square - height) < 2) {
          copy[y][x] = square + 10;
          return true;
        } else {
          return false;
        }
      }
    };

    // legibly print map in console
    printMap () {
      console.log("-----Turns: " + this.turns);
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
    };

    // reset all of the visited coordinates
    resetMap () {
      for (let i = 0; i < 33; i++) {
        for (let j = 0; j < 33; j++) {
          if (this.caveMap[i][j] > 9) {
            this.caveMap[i][j] = this.caveMap[i][j] - 10;
          }
        }
      }
    };

    // calculate the next stair to place a block on by stepping forward until being on a stair that still needs blocks to reach needed height AND is one level lower than the next block
    calcNextNeededStair () {
      let step = 0;
      while (step < 5) {
        const stair = this.staircase[step];
        const nextStair = this.staircase[step + 1];
        if (this.caveMap[stair.loc[1]][stair.loc[0]] < stair.neededHeight &&
          this.caveMap[nextStair.loc[1]][nextStair.loc[0]] ===
          this.caveMap[stair.loc[1]][stair.loc[0]] + 1) {
          break;
        }
        step++;
      }

      // const path = fullClimb.slice(0, step);
      return step;
    };

    // map out plan for staircase of 8 steps circling the gold
    genStaircase () {
      this.staircase = [
        {
          loc: [this.gold[0] + 1, this.gold[1] - 1],
          currHeight: this.caveMap[this.gold[1] - 1][this.gold[0] + 1],
          neededHeight: 1,
        },
        {
          loc: [this.gold[0] + 1, this.gold[1]],
          currHeight: this.caveMap[this.gold[1]][this.gold[0] + 1],
          neededHeight: 2,
        },
        {
          loc: [this.gold[0] + 1, this.gold[1] + 1],
          currHeight: this.caveMap[this.gold[1] + 1][this.gold[0] + 1],
          neededHeight: 3,
        },
        {
          loc: [this.gold[0], this.gold[1] + 1],
          currHeight: this.caveMap[this.gold[1] + 1][this.gold[0]],
          neededHeight: 4,
        },
        {
          loc: [this.gold[0] - 1, this.gold[1] + 1],
          currHeight: this.caveMap[this.gold[1] + 1][this.gold[0] - 1],
          neededHeight: 5,
        },
        {
          loc: [this.gold[0] - 1, this.gold[1]],
          currHeight: this.caveMap[this.gold[1]][this.gold[0] - 1],
          neededHeight: 6,
        },
        {
          loc: [this.gold[0], this.gold[1]],
          currHeight: this.caveMap[this.gold[1]][this.gold[0]],
          neededHeight: 8,
        },
      ];
    };

tus
    up () {
      this.location[1] = this.location[1] - 1;
      this.prevMove = "up";
      return "up";
    };
    down () {
      this.location[1] = this.location[1] + 1;
      this.prevMove = "down";
      return "down";
    };
    left () {
      this.prevMove = "left";
      this.location[0] = this.location[0] - 1;
      return "left";
    };
    right () {
      this.prevMove = "right";
      this.location[0] = this.location[0] + 1;
      return "right";
    };
    pickup () {
      this.prevMove = "pickup";
      if (this.caveMap[this.location[1]][this.location[0]] === 0) {
        console.log("picking up empty square");
        console.log(this.location);
      }
      // remove block we just picked up from list of blocks to be gathered
      this.blocks.delete(this.location);
      this.hasBlock = true;
      return "pickup";
    };
    drop () {
      this.prevMove = "drop";
      this.hasBlock = false;
      return "drop";
    };

    // helpers
    // convert coordinate pair into distance from staircase start
    calcDistanceToGold (coords) {
      return (
        Math.abs(this.gold[0] - coords[0]) + Math.abs(this.gold[1] - coords[1])
      );
    };

    // takes in a path from A to B, reutrns path from B to A
    flipAndReversePath (path) {
      return path.reverse().map((x) => this.flipTurn(x));
    };

    // returns opposite of a turn/move
    flipTurn (turn) {
      if (turn === "down") return "up";
      if (turn === "up") return "down";
      if (turn === "left") return "right";
      if (turn === "right") return "left";
      if (turn === "pickup") return "drop";
      if (turn === "drop") return "pickup";
    };

    // convert coordinate path to array of string moves by comparing each square to prev square and return
    convertPathToTurns (path, prevBlock) {
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

    // check and return whether a square is part of the staircase plan
    checkIfInStaircase (coords) {
      if (coords[0] + 1 === this.gold[0] && coords[1] + 1 === this.gold[1])
        return false;
      if (coords[0] === this.gold[0] && coords[1] + 1 === this.gold[1])
        return false;
      if (Math.abs(coords[0] - this.gold[0]) < 2 &&
        Math.abs(coords[1] - this.gold[1]) < 2)
        return true;
      return false;
    };

    calcDistanceToTroll (coords) {
      return (
        Math.abs(this.location[0] - coords[0]) +
        Math.abs(this.location[1] - coords[1])
      );
    };

    printX() {
      console.log(this.x)
    }
  
}

// subclass to emulate storing arrays in a set (since arrays are always unique in memory)
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
  // return to 2D array
  toArray() {
    return Array.from(this).map((block) =>
      block.split(",").map((coord) => parseInt(coord))
    );
  }
}

// class Stacker2 {
//   constructor (y) {

//   }
// }