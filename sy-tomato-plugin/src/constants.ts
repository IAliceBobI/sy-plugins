export const STORAGE_SETTINGS = "tomato-settings.json"; // plugin switch
export const TOMATOBACKLINKKEY = "custom-tomatobacklink";
export const TOMATOMENTIONKEY = "custom-tomatomention";
export const STORAGE_SCHEDULE = "schedule.json";
export const STORAGE_TOMATO_TIME = "tomato-time.json";
export const STORAGE_AUTO_BK = "auto_bk";
export const STORAGE_INSERT_HEADING = "insert_heading";
export const ATTR_PIC_OVERLAY = "custom-attr-pic-overlay";
export const OVERLAY_DIV = "overlayDiv";

// https://markdowntohtml.com/
export const SEARCH_HELP = `
<div class="b3-dialog__content tomato-style__centered-text">
<p>
    <strong>输入的<span class="fn__code">关键词</span>之间用
    <span class="fn__code">空格</span>隔开，
    如果关键词前面加上<span class="fn__code">感叹号</span>，
    代表反链中不能有此关键词。</strong></p>
<br>
<p>
<strong>比如：</strong> <span class="fn__code">小明 小红 !老王 !王总</span>，
将搜索到包含<span class="fn__code">小明</span>，
并且包含<span class="fn__code">小红</span>，
但不包含<span class="fn__code">老王</span>，
也不包含<span class="fn__code">王总</span>的反链。</p>
<br>

<p>
<strong>多个关键词之间用<span class="fn__code">|</span>切分，
代表这些关键词只要有一个出现即可。</strong></p>
<br>
<p>
    <strong>比如：</strong> 
    <span class="fn__code">小明 小红|如花|秋菊 !老王 !王总</span>，
    将搜索到包含<span class="fn__code">小明</span>，
    并且至少包含<span class="fn__code">小红</span>、
    <span class="fn__code">如花</span>、
    <span class="fn__code">秋菊</span>中一个，
    但不包含<span class="fn__code">老王</span>，
    也不包含<span class="fn__code">王总</span>的反链。</p>
<br>
<a href="https://gitee.com/TokenzQdBN/sy-plugins/blob/main/sy-tomato-plugin/README_zh_CN.md#%E6%90%9C%E7%B4%A2%E8%AF%AD%E6%B3%95">更多例子</a>
</div>
`;

