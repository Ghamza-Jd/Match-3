
cc.Class({
    extends: cc.Component,

    Play: function(){
        cc.director.loadScene("scene");
    },

    Exit: function(){
        cc.game.end();
    },
});
