Blockly.Blocks['out_led_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([["青", "blue"], ["緑", "green"], ["黄", "yellow"], ["赤", "red"], ["白", "white"]]), "color")
        .appendField("をけす");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(180);
    this.setTooltip('');
    this.setHelpUrl('http://www.example.com/');
  }
};
