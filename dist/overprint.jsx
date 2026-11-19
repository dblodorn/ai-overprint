"use strict";
//@target illustrator
// Overprint: approximates markhurrell.com's overprinter (CSS blur + hard alpha
// threshold) with live vector effects on the selection:
//
//   [Pathfinder Add] -> Offset +r -> Offset -2r -> Offset +r+bias   (round joins)
//
// +r/-r is a morphological closing (fills ink traps, rounds inner corners),
// -r/+r an opening (rounds outer corners). bias stands in for moving the
// threshold along the blurred edge, i.e. the site's Overprint slider.
(function () {
    // Tuning: how blur sigma and threshold position map to offsets.
    var RADIUS_PER_SIGMA = 1.5;
    var BIAS_PER_SIGMA_PER_POINT = 1 / 25; // per Overprint point away from 50
    var DEFAULTS = { deterioration: 0.04, overprint: 67 };
    function offsetXML(ofst) {
        // jntp: 0 round, 1 bevel, 2 miter
        return '<LiveEffect name="Adobe Offset Path"><Dict data="R mlim 4 R ofst ' +
            ofst.toFixed(3) + ' I jntp 0 "/></LiveEffect>';
    }
    function offsets(s) {
        var sigma = s.deterioration * s.ref;
        return {
            r: RADIUS_PER_SIGMA * sigma,
            bias: sigma * (s.overprint - 50) * BIAS_PER_SIGMA_PER_POINT
        };
    }
    // Pathfinder Add goes through the menu (Effect > Pathfinder > Add), not
    // applyEffect: a scripted Pathfinder LiveEffect lands below the fill/stroke
    // in the appearance stack and wipes the fill.
    function applyOverprint(item, s, merge) {
        var o = offsets(s);
        if (merge) {
            app.activeDocument.selection = [item];
            app.executeMenuCommand('Live Pathfinder Add');
        }
        if (o.r > 0) {
            item.applyEffect(offsetXML(o.r));
            item.applyEffect(offsetXML(-2 * o.r));
        }
        if (o.r + o.bias !== 0)
            item.applyEffect(offsetXML(o.r + o.bias));
    }
    function defaultRef(item) {
        if (item.typename === 'TextFrame') {
            var size = item.textRange.characterAttributes.size;
            if (size > 0)
                return size;
        }
        var b = item.visibleBounds; // [left, top, right, bottom]
        return Math.round(Math.abs(b[1] - b[3]) * 10) / 10;
    }
    // --- Main ------------------------------------------------------------------
    if (app.documents.length === 0) {
        alert('Overprint: open a document and select something first.');
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || !sel.length || sel.typename === 'TextRange') {
        alert('Overprint: select a group, path or text frame (not text inside a frame).');
        return;
    }
    var originals = [];
    for (var i = 0; i < sel.length; i++)
        originals.push(sel[i]);
    var previews = [];
    function clearPreview() {
        for (var i = 0; i < previews.length; i++)
            previews[i].remove();
        previews = [];
        for (var j = 0; j < originals.length; j++)
            originals[j].hidden = false;
    }
    function showPreview(s) {
        clearPreview();
        for (var i = 0; i < originals.length; i++) {
            var dup = originals[i].duplicate();
            applyOverprint(dup, s, mergeBox.value);
            previews.push(dup);
            originals[i].hidden = true;
        }
        app.redraw();
    }
    // --- Dialog ----------------------------------------------------------------
    var w = new Window('dialog', 'Overprint');
    w.alignChildren = 'fill';
    function sliderRow(label, min, max, value, decimals) {
        var g = w.add('group');
        g.add('statictext', undefined, label).preferredSize.width = 95;
        var slider = g.add('slider', undefined, value, min, max);
        slider.preferredSize.width = 200;
        var field = g.add('edittext', undefined, value.toFixed(decimals));
        field.characters = 6;
        slider.onChanging = function () {
            field.text = slider.value.toFixed(decimals);
        };
        field.onChange = function () {
            var v = parseFloat(field.text);
            if (isNaN(v))
                v = slider.value;
            v = Math.min(max, Math.max(min, v));
            slider.value = v;
            field.text = v.toFixed(decimals);
            update();
        };
        slider.onChange = function () {
            field.text = slider.value.toFixed(decimals);
            update();
        };
        return { value: function () { return parseFloat(field.text); } };
    }
    var deterioration = sliderRow('Deterioration', 0, 0.15, DEFAULTS.deterioration, 3);
    var overprint = sliderRow('Overprint', 2, 98, DEFAULTS.overprint, 0);
    var refGroup = w.add('group');
    refGroup.add('statictext', undefined, 'Reference (pt)').preferredSize.width = 95;
    var refField = refGroup.add('edittext', undefined, String(defaultRef(originals[0])));
    refField.characters = 6;
    refGroup.add('statictext', undefined, '= 1em (font size for text)');
    refField.onChange = function () {
        if (!(parseFloat(refField.text) > 0))
            refField.text = String(defaultRef(originals[0]));
        update();
    };
    var mergeBox = w.add('checkbox', undefined, 'Merge overlapping shapes (Pathfinder Add)');
    mergeBox.value = true;
    mergeBox.onClick = function () { update(); };
    var previewBox = w.add('checkbox', undefined, 'Preview');
    previewBox.value = true;
    previewBox.onClick = function () { update(); };
    var buttons = w.add('group');
    buttons.alignment = 'right';
    buttons.add('button', undefined, 'Cancel', { name: 'cancel' });
    buttons.add('button', undefined, 'OK', { name: 'ok' });
    function settings() {
        return {
            deterioration: deterioration.value(),
            overprint: overprint.value(),
            ref: parseFloat(refField.text)
        };
    }
    function update() {
        if (previewBox.value)
            showPreview(settings());
        else {
            clearPreview();
            app.redraw();
        }
    }
    w.onShow = function () { update(); };
    var result = w.show();
    clearPreview();
    if (result === 1) {
        var s = settings();
        for (var k = 0; k < originals.length; k++)
            applyOverprint(originals[k], s, mergeBox.value);
    }
    doc.selection = originals;
    app.redraw();
})();
