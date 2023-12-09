<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { fabric } from "fabric";
    import { getID } from "./libs/utils";

    export let imgSpan: HTMLSpanElement;
    export let nextOverlays: Overlay[];
    export let originOverlays: Overlay[];
    let canvas: fabric.Canvas;

    onMount(async () => {
        const imgID = getID(imgSpan);
        const imgSrc = imgSpan?.querySelector("img")?.getAttribute("src") ?? "";
        if (imgID && imgSrc) {
            const imgTag = new Image();
            imgTag.src = imgSrc;
            canvas = new fabric.Canvas("imgOverlayBoxCanvas", {
                stateful: true,
                selection: false,
                uniformScaling: false,
            });
            imgTag.onload = (_e) => {
                const img = new fabric.Image(imgTag);
                canvas.setWidth(imgTag.width);
                canvas.setHeight(imgTag.height);
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: 1,
                    scaleY: 1,
                });
                originOverlays?.forEach((o) => {
                    canvas.add(
                        createOverlay(
                            o.cID,
                            o.left,
                            o.top,
                            o.width,
                            o.height,
                            o.angle,
                        ),
                    );
                });
                canvas.renderAll();
            };
        }
    });

    onDestroy(() => {
        canvas.getObjects().forEach((obj) => {
            nextOverlays.push({
                left: obj.left,
                top: obj.top,
                width: obj.getScaledWidth(),
                height: obj.getScaledHeight(),
                angle: obj.angle,
                cID: (obj as any)?.getObjects()[1]?.text,
            });
        });
        canvas.dispose();
    });

    function createOverlay(
        cID = "1",
        left = 40,
        top = 40,
        width = 80,
        height = 80,
        angle = 0,
    ) {
        const rect = new fabric.Rect({
            fill: "#fae1cf",
            stroke: "#000",
            strokeWidth: 1,
            strokeUniform: true,
            noScaleCache: false,
            opacity: 0.68,
            width: width,
            height: height,
            originX: "center",
            originY: "center",
        });
        const text = new fabric.Text(cID, {
            originX: "center",
            originY: "center",
        });
        text.scaleToHeight(height);
        const group = new fabric.Group([rect, text], {
            left: left,
            top: top,
            width: width,
            height: height,
            originX: "center",
            originY: "center",
            angle: angle,
        });
        return group;
    }

    function add() {
        const c = canvas.getObjects().length + 1;
        canvas.add(createOverlay(String(c)));
        canvas.renderAll();
    }

    function remove() {
        const len = canvas.getObjects().length;
        if (len > 0) {
            const last = canvas.getObjects()[len - 1];
            canvas.remove(last);
            canvas.renderAll();
        }
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">
    <canvas id="imgOverlayBoxCanvas"></canvas>
    <button class="b3-button" on:click={add}>添加一个层</button>
    <button class="b3-button" on:click={remove}>删除最后一个层</button>
</div>
