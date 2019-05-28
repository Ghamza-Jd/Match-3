
var drag = false;
var selectedTile = {selected: false, column: 0, row: 0};
var currentmove = {column1: 0, row1: 0, column2: 0, row2: 0};
var gameStates = {init: 0, ready: 1, resolve: 2};
var gameState = gameStates.init;
var animationstate = 0;
var animationtime = 0;
var animationtimetotal = 0.3;
var swapTime = 0.2;
var score = 0;
var fruits = [];
var tiles = [];
var moves = [];
var clusters = [];
var gaps = [];

cc.Class({
    extends: cc.Component,

    properties: {
        columns:        {default: 8, visible: false},
        rows:           {default: 8, visible: false},
        tileprefab:     {default: [], type: cc.Prefab,},
        background:     {default: null, type: cc.Prefab,},
        tileWidth:      {default: 0, visible: false,},
        tileHeight:     {default: 0, visible: false,},
        nullTile:       {default: null, type: cc.Prefab},
        label:          {default: null, type: cc.Label,},
    },

    //Method name:grid init
    //Purpose:intializes the 2D array of the board

    grid_init: function(){
        for(let i = 0; i < this.columns; i++){
            tiles.push([]);
            gaps.push(0);
            for(let j = 0; j < this.rows; j++){
                tiles[i].push({type: 0, shift: 0, instance: false,});
            }
        }
    },

    //Method name: deleteAll
    //Purpose: destory all the fruits

    deleteAll: function(){
        for(let i = 0; i < this.columns; i++){
            for(let j = 0; j < this.rows; j++){
                fruits[i][j].destroy();
            }
        }
        fruits = [];
    },

    //Method name: clearGaps
    //Purpose: make the gaps array (gaps[]) an array of zeros

    clearGaps: function(){
        for(let i = 0; i < gaps.length; i++){
            gaps[i] = 0;
        }
    },

    //Method name: size
    //Purpose: create 1 temperary prefab inorder to calculate the tile dimentions

    size() {
        var tile = cc.instantiate(this.tileprefab[0]);
        this.tileWidth = tile.width * tile.scaleX + 5;
        this.tileHeight = tile.height * tile.scaleY + 5;
        tile.destroy();
    },

    //Method name: isInBoarder
    //Purpose: checks if a given tile is in the boarder range or not

    isInBoarder: function(x, y){
        if(x >= 0 && x <= this.columns - 1 && y >= 0 && y <= this.rows - 1)
            return true;
        return false;
    },

    //Method name: getRandomTile
    //Purpose: returns a random tile id
    
    getRandomTile: function(){
        return Math.floor(Math.random() * this.tileprefab.length);
    },

    //Method name: tileToWorld
    //Purpose: return the world coordinates for a given tile

    tileToWorld: function(column, row){
        var tilex = (-this.columns / 2 + column) * this.tileHeight + this.tileHeight / 2;
        var tiley = (this.rows / 2 - row) * this.tileWidth - this.tileWidth / 2;
        return cc.v2(tilex, tiley);
    },

    //Method name: worldToTile
    //Purpose: returns the tile coordinates for a given world coordinates

    worldToTile: function(x, y){
        if(this.columns % 2 == 0)
            x -= this.tileHeight / 2;
        if(this.rows % 2 == 0)
            y += this.tileWidth / 2;
        var i = (x / this.tileHeight) + (this.columns / (2 * this.tileHeight)) ;
        var j = -(y / this.tileWidth) + (this.rows / (2 * this.tileWidth));
        i = Math.round(i + Math.round(this.columns / 2));
        j = Math.round(j + Math.round(this.rows / 2));
        if(i >= 0 && i < this.columns  && j >= 0 && j < this.rows){
            return {
                valid: true,
                i: i,
                j: j
            };
        }
        return {
            valid: false,
            i: 0, 
            j: 0
        };
    },

    //Method name: renderSingleTile
    //Purpose: Instantiate a tile on a give tile coordinates

    renderSingleTile: function(i, j){
        var singleTile = cc.instantiate(this.tileprefab[tiles[i][j].type]);
        tiles[i][j].instance = true;
        fruits[i].push(singleTile);
        var point = this.tileToWorld(i, j);
        singleTile.setPosition(point);
        this.node.addChild(singleTile);
    },

    //Method name: renderTiles
    //Purpose: Loops through the tiles 2D array and instantiate the fruits by the ID found in the tiles[][]

    renderTiles: function(){
        for(let i = 0; i < this.columns; i++){
            for(let j = 0; j < this.rows; j++){
                fruits.push([]);
                if(tiles[i][j].type >= 0){
                    this.renderSingleTile(i, j);
                }
            }
        }
    },

    //Method name: renderBackground
    //Purpose: instantiate the background prefab
    
    renderBackground: function(){
        var bg = cc.instantiate(this.background);
        this.node.addChild(bg);
    },

    //Method name: createLevel
    //Purpose: keeps generating random boards until we have a board with no matches, but with a given number of available moves

    createLevel: function(){
        this.size();
        var done = false;
        while(!done){
            for(let i = 0; i < this.columns; i++){
                for(let j = 0; j < this.rows; j++){
                    tiles[i][j].type = this.alwaysHaveMoves(i);
                }
            }
            this.resolveClusters();
            this.findMoves();
            
            if(moves.length > 0){
               done = true;
            }
             
        }
    },

    //Method name: resolveClusters
    //Purpose: applies gravity effect on the tiles

    resolveClusters: function(){
        this.findClusters();
        while(clusters.length > 0){
            this.removeClusters();
            this.shiftTiles();
            this.findClusters();
        }
    },

    //Method name: findClusters
    //Purpose: Loops through the tiles 2D array (tiles[][]) and checks if we have matches

    findClusters: function(){
        clusters = [];
        for(let j = 0; j < this.rows; j++){
            var matchlength = 1;
            for(let i = 0; i < this.columns; i++){
                var checkclusters = false;
                if(i == this.columns - 1){
                    checkclusters = true;
                }
                else{
                    if(tiles[i][j].type == tiles[i + 1][j].type
                        && tiles[i][j].type != -1){
                            matchlength += 1;
                        }
                    else{
                        checkclusters = true;
                    }
                }
                if(checkclusters) {
                    if(matchlength >= 3){
                        clusters.push({column: i + 1 - matchlength, row: j, length: matchlength, horizontal: true});
                    }
                    matchlength = 1;
                }
            }
        }
        for(let i = 0; i < this.columns; i++){
            var matchlength = 1;
            for(let j = 0; j < this.rows; j++){
                var checkclusters = false;
                if(j == this.rows - 1){
                    checkclusters = true;
                }
                else{
                    if(tiles[i][j].type == tiles[i][j + 1].type
                        && tiles[i][j].type != -1)
                        matchlength += 1;
                    else{
                        checkclusters = true;
                    }
                }
                if(checkclusters){
                    if(matchlength >= 3){
                        clusters.push({column: i, row: j + 1 - matchlength, length: matchlength, horizontal: false});
                    }
                    matchlength = 1;
                } 
            }
        }
    },

    //Method name: findMoves
    //Purpose: Loops through the tiles 2D array (tiles[][]) and checks if we have moves by simuating swaps horizontaly and verticaly

    findMoves: function(){
        moves = [];
        for(let j = 0; j < this.rows; j++){
            for(let i = 0; i < this.columns - 1; i++){
                this.swap(i, j, i + 1, j);
                this.findClusters();
                this.swap(i, j, i + 1, j);;
                if(clusters.length > 0){
                    moves.push({column1: i, row1: j, column2: i + 1, row2: j});
                }
            }
        }
        for(let i = 0; i < this.columns; i++){
            for(let j = 0; j < this.rows - 1; j++){
                this.swap(i, j, i, j + 1);
                this.findClusters();
                this.swap(i, j, i, j + 1);
                if(clusters.length > 0){
                    moves.push({column1: i, row1: j, column2: i, row2: j + 1});
                }
            }
        }
        clusters = [];
    },

    //Method name: loopClusters
    //Purpose: loops through the cluster array (clusters[]) and mark the tiles in the tiles 2D array (tiles[][]) as a tiles to be deleted

    loopClusters: function(){
        for(let i = 0; i < clusters.length; i++){
            var cluster = clusters[i];
            var coffset = 0;
            var roffset = 0;
            for(let j = 0; j < cluster.length; j++){

                var x = cluster.column + coffset;
                var y = cluster.row + roffset;
                tiles[x][y].type = -1;
                tiles[x][y].instance = false;
                fruits[x][y].destroy();
                var newTile = cc.instantiate(this.nullTile);
                fruits[x][y] = newTile;
                var point = this.tileToWorld(x, y);
                newTile.setPosition(point);
                this.node.addChild(newTile);

                if(cluster.horizontal){
                    coffset++;
                }
                else{
                    roffset++;
                }
            }
        }
    },

    //Method name: removeClusters
    //Purpose: Give each tile how much it should be shifted (for the gravity effect)

    removeClusters: function(){
        try{
            this.loopClusters();
        }
        catch(e){
            e.name;
        }
        for(let i = 0; i < this.columns; i++){
            var shift = 0;
            for(let j = this.rows - 1; j >= 0; j--){
                if(tiles[i][j].type == -1){
                    shift++;
                    tiles[i][j].shift = 0;
                }
                else{
                    tiles[i][j].shift = shift;
                }
            }
        }
    },

    //Method name: shiftTiles
    //Purpose: Loop through tile[][] and switch any tiles that should be affected by gravity and give an ID for those who was marked to be deleted "-1"

    shiftTiles: function(){
        for(let i = 0; i < this.columns; i++){
            for(let j = this.rows - 1; j >= 0; j--){
                if(tiles[i][j].type == -1){
                    gaps[i]++;
                    tiles[i][j].type = this.alwaysHaveMoves(i);
                }
                else{
                    var shift = tiles[i][j].shift;
                    if(shift > 0){
                        this.totalSwap(i, j, i, j + shift);
                    }
                }
                tiles[i][j].shift = 0;
            }
        }
        this.clearGaps();    
        
    },

    //Method name: canSwap
    //Purpose: checks if we can perform the given swap

    canSwap: function(x1, y1, x2, y2){
        if((Math.abs(x1 - x2) == 1 && y1 == y2) ||
            (Math.abs(y1 - y2) == 1 && x1 == x2)){
                return true;
            }
            return false;
    },

    //Method name: swap
    //Purpose: apply the swap on the tiles[][]

    swap: function(x1, y1, x2, y2){
        var typeswap = tiles[x1][y1].type;
        tiles[x1][y1].type = tiles[x2][y2].type;
        tiles[x2][y2].type = typeswap;
    },

    //Method name: fruitSwap
    //Purpose: apply the swap on fruits[][]

    fruitSwap: function(x1, y1, x2, y2){
        var temp = fruits[x1][y1];
        fruits[x1][y1] = fruits[x2][y2];
        fruits[x2][y2] = temp;
    },

    //Method name: graphicalSwap
    //Purpose: animate the swap
    
    graphicalSwap: function(x1, y1, x2, y2){
        var action = cc.moveTo(swapTime, this.tileToWorld(x2, y2).x, this.tileToWorld(x2, y2).y);
        var anotherAction = cc.moveTo(swapTime, this.tileToWorld(x1, y1).x, this.tileToWorld(x1, y1).y);
        fruits[x1][y1].runAction(action);
        fruits[x2][y2].runAction(anotherAction);
        this.fruitSwap(x1, y1, x2, y2);
    },

    //Method name: totalSwap
    //Purpose: 

    totalSwap: function(x1, y1, x2, y2){
        var tile1 = {i: x1, j: y1};
        var tile2 = {i: x2, j: y2};
        if(this.isInBoarder(tile1.i, tile1.j) && this.isInBoarder(tile2.i, tile2.j)){
            this.swap(tile1.i, tile1.j, tile2.i, tile2.j);
            try{
                this.graphicalSwap(tile1.i, tile1.j, tile2.i, tile2.j);
            }catch(e){e.name;}
        }
    },

    //Method name: mouseSwap
    //Purpose: stores the marked tile for swapping
    
    mouseSwap: function(c1, r1, c2, r2){
        currentmove = {column1: c1, row1: r1, column2: c2, row2: r2};
        selectedTile.selected = false;
        animationstate = 2;
        animationtime = 0;
        gameState = gameStates.resolve;
    },

    //Method name: onMouseMove
    //Purpose: handles the mouse moving event

    onMouseMove: function(event){
        var pos = this.node.parent.convertToNodeSpaceAR(event.getLocation());
        if(drag && selectedTile.selected){
            var mt = this.worldToTile(pos.x, pos.y);
            if(mt.valid){
                if(this.canSwap(mt.i, mt.j, selectedTile.column, selectedTile.row))
                    this.mouseSwap(mt.i, mt.j, selectedTile.column, selectedTile.row);
            }
        }
    },

    //Method name: onMouseDown
    //Purpose: handles the click of the mouse event

    onMouseDown: function(event){
        var pos = this.node.parent.convertToNodeSpaceAR(event.getLocation());
        if(!drag){
            var mt = this.worldToTile(pos.x, pos.y);
            if(mt.valid){
                var swapped = false;
                if(selectedTile.selected){
                    if(mt.i == selectedTile.column && mt.j == selectedTile.row){
                        selectedTile.selected = false;
                        drag = true;
                        return;
                    }
                    else if(this.canSwap(mt.i, mt.j, selectedTile.column, selectedTile.row)){
                        this.mouseSwap(mt.i, mt.j, selectedTile.column, selectedTile.row);
                        swapped = true;
                    }
                }
                if(!swapped){
                    selectedTile.column = mt.i;
                    selectedTile.row = mt.j;
                    selectedTile.selected = true;
                }
            }
            else{
                selectedTile.selected = false;
            }
            drag = true;
        }
    },

    //Method name: onMouseUp
    //Purpose: handles the release of the mouse button event

    onMouseUp: function(event){
        var pos = this.node.parent.convertToNodeSpaceAR(event.getLocation());
        if(drag && selectedTile.selected){
            var mt = this.worldToTile(pos.x, pos.y);
            if(mt.valid){
                if(this.canSwap(mt.i, mt.j, selectedTile.column, selectedTile.row))
                    this.mouseSwap(mt.i, mt.j, selectedTile.column, selectedTile.row);
            }
        }
        drag = false;
    },

    //Method name: event_init
    //Purpose: intialzes the events

    event_init: function() {
        var self = this;
        this.node.parent.on('mousedown', function(event){self.onMouseDown(event)});
        this.node.parent.on('mouseup', function(event){self.onMouseUp(event)});
        this.node.parent.on('mousemove', function(event){self.onMouseMove(event)});
    },

    onLoad () {
        this.event_init();
    },

    start () {
        this.grid_init();
        this.createLevel();
        this.renderBackground();
        this.renderTiles();
    },

    update (dt) {
        if(gameState == gameStates.resolve){
            animationtime += dt;
            if(animationstate == 0){
                if(animationtime > animationtimetotal){
                    this.findClusters();
                    if(clusters.length > 0){
                        for(let i = 0; i < clusters.length; i++){
                            score += 100 * (clusters[i].length - 2);
                        }

                        this.removeClusters();
                        animationstate = 1;
                    }
                    else{
                        gameState = gameStates.ready;
                    }
                    animationtime = 0;
                }
            }
            else if(animationstate == 1) {
                if(animationtime > animationtimetotal){
                    this.shiftTiles();
                    animationstate = 0;
                    animationtime = 0;
                    this.findClusters();
                    if(clusters.length <= 0){
                        gameState = gameStates.ready;
                        this.frameRender();
                    }
                }
            }
            else if(animationstate == 2) {
                if(animationtime > animationtimetotal){
                    this.totalSwap(currentmove.column1, currentmove.row1, currentmove.column2, currentmove.row2);
                    this.findClusters();
                    if(clusters.length > 0){
                        animationstate = 0;
                        animationtime = 0;
                        gameState = gameStates.resolve;
                    }
                    else{
                        animationstate = 3;
                        animationtime = 0;
                    }

                    this.findMoves();
                    this.findClusters();
                }
            }
            else if(animationstate == 3){
                if(animationtime > animationtimetotal){
                    this.totalSwap(currentmove.column1, currentmove.row1, currentmove.column2, currentmove.row2);
                    gameState = gameStates.ready;
                    this.frameRender();
                }
            }
            this.findMoves();
            this.findClusters();
        }
    },

    //Method name: alwaysHaveMoves
    //Purpose: checks if we have less than 2 moves, if so we have to generate certain tiles to make the game still playable else just generate a random one

    alwaysHaveMoves: function(pos){
        var havedone = false;
        var choice = [];
        var g1 = 0;
        var g2 = 0;
        if(gameState == gameStates.init || moves.length >= 2){
            return this.getRandomTile();
        }
        else{

            //------- 1 -------\\
            
            if(pos >= 3){
                g1 = tiles[pos - 2][gaps[pos] - 1].type;
                g2 = tiles[pos - 3][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 0, type: g1});
                    havedone = true;
                }
            }
            if(pos >= 3){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g2 = tiles[pos - 3][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 1, type: g1});
                    havedone = true;
                }
            }
            if(pos >= 2 && pos <= 6){
                g1 = tiles[pos - 2][gaps[pos] - 1].type;
                g2 = tiles[pos + 1][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 2, type: g1});
                    havedone = true;
                }
            }
            if(pos >= 1 && pos <= 5){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g2 = tiles[pos + 2][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 3, type: g1});
                    havedone = true;
                }
            }
            if(pos <= 4){
                g1 = tiles[pos + 2][gaps[pos] - 1].type;
                g2 = tiles[pos + 3][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 4, type: g1});
                    havedone = true;
                }
            }

            //------- 2 -------\\

            if(gaps[pos] >= 2 && pos >= 2){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g2 = tiles[pos - 2][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 12, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] >= 2 && pos >= 1 && pos <= 6){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g2 = tiles[pos + 1][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 13, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] >= 2 && pos <= 5){
                g1 = tiles[pos + 1][gaps[pos] - 1].type;
                g2 = tiles[pos + 2][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 14, type: g1});
                    havedone = true;
                }
            }

            //------- 3 -------\\

            if(gaps[pos] >= 3 && pos >= 1){
                g1 = tiles[pos - 1][gaps[pos] - 3].type;
                g2 = tiles[pos - 1][gaps[pos] - 2].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 15, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] >= 3 && pos <= 6){
                g1 = tiles[pos + 1][gaps[pos] - 3].type;
                g2 = tiles[pos + 1][gaps[pos] - 2].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 16, type: g1});
                    havedone = true;
                }
            }

            //------- 4 -------\\s

            if(gaps[pos] <= this.rows - 1 && pos <= 5){
                g1 = tiles[pos + 1][gaps[pos]].type;
                g2 = tiles[pos + 2][gaps[pos]].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 17, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 1 && pos >= 1 && pos <= 6){
                g1 = tiles[pos - 1][gaps[pos]].type;
                g2 = tiles[pos + 1][gaps[pos]].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 18, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 1 && pos >= 2){
                g1 = tiles[pos - 1][gaps[pos]].type;
                g2 = tiles[pos - 2][gaps[pos]].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 19, type: g1});
                    havedone = true;
                }
            }

            //------- 5 -------\\

            if(gaps[pos] <= this.rows - 2 && pos <= 6){
                g1 = tiles[pos + 1][gaps[pos]].type;
                g2 = tiles[pos + 1][gaps[pos] + 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 20, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 2 && pos >= 1){
                g1 = tiles[pos - 1][gaps[pos]].type;
                g2 = tiles[pos - 1][gaps[pos] + 1].type;
                if(g1 == g2 && g1 != -1 && g1 != 7){
                    choice.push({case: 21, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 2 && pos <= 6){
                g1 = tiles[pos][gaps[pos]].type;
                g2 = tiles[pos + 1][gaps[pos] + 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 22, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 2 && pos >= 1){
                g1 = tiles[pos][gaps[pos]].type;
                g2 = tiles[pos - 1][gaps[pos] + 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 23, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 1 && gaps[pos] >= 2 && pos <= 6){
                g1 = tiles[pos + 1][gaps[pos] - 2];
                g2 = tiles[pos + 1][gaps[pos]];
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 24, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 1 && gaps[pos] >= 2 && pos >= 1){
                g1 = tiles[pos - 1][gaps[pos] - 2];
                g2 = tiles[pos - 1][gaps[pos]];
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 25, type: g1});
                    havedone = true;
                }
            }

            //------- 6 -------\\

            if(gaps[pos] <= this.rows - 4){
                g1 = tiles[pos][gaps[pos]].type;
                g2 = tiles[pos][gaps[pos] + 2].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 26, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 4){
                g1 = tiles[pos][gaps[pos] + 1].type;
                g2 = tiles[pos][gaps[pos] + 2].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 27, type: g1});
                    havedone = true;
                }
            }

            //------- 7 -------\\


            
    		if(pos <= 4){
    			if(gaps[pos] == gaps[pos + 1] && gaps[pos] == gaps[pos + 3]){
    				if(tiles[pos + 1][gaps[pos] - 1].instance == false){
    					g1 = tiles[pos + 3][gaps[pos] - 1].type;
    					if(g1 != -1  ){
    						choice.push({case: 32, type: g1});
    						havedone = true;
    					}
    				}
    			}
    		}

    		if(pos >= 1 && pos <= 5){
    			if(gaps[pos] == gaps[pos - 1] && gaps[pos] == gaps[pos + 2]){
    				if(tiles[pos - 1][gaps[pos] - 1].instance == false){
    					g1 = tiles[pos + 2][gaps[pos] - 1].type;
    					if(g1 != -1){
    						choice.push({case: 33, type: g1});
    						havedone = true;
    					}
    				}
    			}
    		}

    		if(pos >= 2 && pos <= 6){
    			if(gaps[pos] == gaps[pos - 2] && gaps[pos] == gaps[pos + 1]){
    				if(tiles[pos + 1][gaps[pos] - 1].instance == false){
    					g1 = tiles[pos - 2][gaps[pos] - 1].type;
    					if(g1 != -1){
    						choice.push({case: 34, type: g1});
    						havedone = true;
    					}
    				}
    			}
    		}

    		if(pos >= 3){
    			if(gaps[pos] == gaps[pos - 3] && gaps[pos] == gaps[pos - 1]){
    				if(tiles[pos - 1][gaps[pos] - 1].instance == false){
    					g1 = tiles[pos - 3][gaps[pos] - 1].type;
    					if(g1 != -1){
    						choice.push({case: 35, type: g1});
    						havedone = true;
    					}
    				}
    			}
    		}


            //------- 8 -------\\

            if(pos >= 2){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g1 = tiles[pos - 2][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 28, type: g1});
                    havedone = true;
                }
            }
            if(pos >= 1 && pos <= 6){
                g1 = tiles[pos - 1][gaps[pos] - 1].type;
                g1 = tiles[pos + 1][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 29, type: g1});
                    havedone = true;
                }
            }
            if(pos <= 5){
                g1 = tiles[pos + 2][gaps[pos] - 1].type;
                g1 = tiles[pos + 1][gaps[pos] - 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 30, type: g1});
                    havedone = true;
                }
            }
            if(gaps[pos] <= this.rows - 2){
                g1 = tiles[pos][gaps[pos]].type;
                g1 = tiles[pos][gaps[pos] + 1].type;
                if(g1 == g2 && g2 != -1 && g1 != 7){
                    choice.push({case: 31, type: g1});
                    havedone = true;
                }
            }

            // 5 -> 8
            
            if(pos >= 1 && pos <= 6){
            	if(tiles[pos + 1][gaps[pos] - 1].instance == false){
            		g1 = tiles[pos - 1][gaps[pos] - 1].type;
            		if(g1 != -1 && gaps[pos + 1] == gaps[pos]  ){
            			choice.push({case: 36, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos >= 2){
            	if(tiles[pos - 1][gaps[pos] - 1].instance == false){
            		g1 = tiles[pos - 2][gaps[pos] - 1].type;
            		if(g1 != -1 && gaps[pos - 1] == gaps[pos]  ){
            			choice.push({case: 37, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos <= 5){
            	if(tiles[pos + 1][gaps[pos] - 1].instance == false){
            		g1 = tiles[pos + 2][gaps[pos] - 1].type;
            		if(g1 != -1 && gaps[pos + 1] == gaps[pos]  ){
            			choice.push({case: 38, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos >= 1 && pos <= 6){
            	if(tiles[pos - 1][gaps[pos] - 1].instance == false){
            		g1 = tiles[pos + 1][gaps[pos] - 1].type;
            		if(g1 != -1 && gaps[pos - 1] == gaps[pos]  ){
            			choice.push({case: 39, type: g1});
            			havedone = true;
            		}
            	}
            }

            //------- 9 -------\\

            // 1 -> 6

            if(pos >= 2 && pos <= 6){
            	if(gaps[pos] == gaps[pos + 1]){
            		g1 = tiles[pos - 2][gaps[j] - 1].type;
            		if(g1 != -1 && tiles[pos + 1][gaps[pos] - 1].instance == false){
            			choice.push({case: 40, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos >= 1 && pos <= 5){
            	if(gaps[pos] == gaps[pos + 2]){
            		g1 = tiles[pos -1][gaps[j] - 1].type;
            		if(g1 != -1 && tiles[pos + 2][gaps[pos] - 1].instance == false){
            			choice.push({case: 41, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos <= 4){
            	if(gaps[pos] == gaps[pos + 2]){
            		g1 = tiles[pos + 3][gaps[pos] - 1].type;
            		if(g1 != -1 && tiles[pos + 2][gaps[pos] - 1].instance == false){
            			choice.push({case: 42, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos <= 4){
            	if(gaps[pos] == gaps[pos + 1]){
            		g1 = tiles[pos + 3][gaps[pos] - 1].type;
            		if(g1 != -1 && tiles[pos + 1][gaps[pos] - 1].instance == false){
            			choice.push({case: 43, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos <= 4){
            	if(gaps[pos] == gaps[pos + 3]){
            		g1 = tiles[pos + 1][gaps[pos] - 1].type;
            		if(g1 != -1 && tiles[pos + 3][gaps[pos] - 1].instance == false){
            			choice.push({case: 44, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(pos <= 4){
            	if(gaps[pos] == gaps[pos + 3]){
            		g1 = tiles[pos + 2][gaps[pos] - 1].type;
            		if(g1 != -1 && tiles[pos + 3][gaps[pos] - 1].instance == false){
            			choice.push({case: 45, type: g1});
            			havedone = true;
            		}
            	}
            }

            if(gaps[pos] >= 2 && gaps[pos] <= level.rows - 3){
                g1 = tiles[pos][gaps[pos] + 1].type;
                if(g1 == g2  ){
                    choice.push({case: 46, type: g1});
                    havedone = true;
                }
            }

            if(gaps[pos] >= 3 && gaps[pos] <= level.rows - 2){
                g1 = tiles[pos][gaps[pos]].type;
                if(g1 == g2  ){
                    choice.push({case: 47, type: g1});
                    havedone = true;
                }
            }

            if(havedone){
                var n = choice[Math.floor(Math.random() * choice.length)];
                switch(n.case){
                	case 32:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 33:
                		tiles[pos - 1][gaps[pos] - 1].type = n.type;
                		tiles[pos - 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 34:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 35:
                		tiles[pos - 1][gaps[pos] - 1].type = n.type;
                		tiles[pos - 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 36:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 37:
                		tiles[pos - 1][gaps[pos] - 1].type = n.type;
                		tiles[pos - 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 38:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 39:
                		tiles[pos - 1][gaps[pos] - 1].type = n.type;
                		tiles[pos - 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 40:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 41:
                		tiles[pos + 2][gaps[pos] - 1].type = n.type;
                		tiles[pos + 2][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 42:
                		tiles[pos + 2][gaps[pos] - 1].type = n.type;
                		tiles[pos + 2][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 43:
                		tiles[pos + 1][gaps[pos] - 1].type = n.type;
                		tiles[pos + 1][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 44:
                		tiles[pos + 3][gaps[pos] - 1].type = n.type;
                		tiles[pos + 3][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 45:
                		tiles[pos + 3][gaps[pos] - 1].type = n.type;
                		tiles[pos + 3][gaps[pos] - 1].instance = true;
                		return n.type;
                	case 46:
                		tiles[pos][gaps[pos] - 2].type = n.type;
                		tiles[pos][gaps[pos] - 2].instance = true;
                		return n.type;
                	case 47:
                		tiles[pos][gaps[pos] - 2].type = getRandomTile();
                		tiles[pos][gaps[pos] - 2].instance = true;
                		tiles[pos][gaps[pos] - 3].type = n.type;
                		tiles[pos][gaps[pos] - 3].instance = true;
                		return n.type;
                	default:
                		return n.type;
                }
            }
            else
                return this.getRandomTile();
        }
    },

    //Method name: frameRender
    //Purpose: destroy all the tiles then redraw them

    frameRender: function(){
        this.deleteAll();
        this.renderTiles();
    },

    /**
     * TODO:
     * [x] Animate the movement
     * [x] Handling input/events
     * [x] Fix the loop cluster error
     * [x] Gravity downwards by inverting the convention on the y-axis
     * [x] Fix the vertical swap in a vertical cluster senario
     * [x] Clean the code
     * [x] Always have move algorithm implementation 
     * [x] Type Error in AHM
     * [ ] Memory Efficent Spawner
     */
});