function setStyleSheet(mode) {
  var link_list = document.head.getElementsByTagName("link");
  if (link_list) {
    var link_dark, link_light;
    for (var i = 0; i < link_list.length; i++) {
      var link = link_list[i];
      if (link.getAttribute("id")) {
        if (link.getAttribute("id") === "theme-light") {
          link_light = link;
        }
        else if (link.getAttribute("id") === "theme-dark") {
          link_dark = link;
        };
      };
    };
  };
  if (mode === "light") {
    link_light.setAttribute("rel", "stylesheet");
    link_dark.setAttribute("rel", "alternate stylesheet");
  } else if (mode === "dark") {
    link_light.setAttribute("rel", "alternate stylesheet");
    link_dark.setAttribute("rel", "stylesheet");
  }

  // // 将新的标签加载到head中最后的位置
  // doc_head.appendChild(link_style);

  // 记录到localStorage
  localStorage.setItem("theme", mode);
};

$(document).ready(function () { // DOM加载完成后启用主题
  const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
  var isDefaultDark = mediaQueryList.matches;
  var lastChoice = localStorage.getItem("theme");
  var mode;

  if (lastChoice != null) { // 上次选择优先
    mode = lastChoice;
  } else {
    mode = isDefaultDark ? "dark" : "light"; // 浏览器偏好优先
  };
  setStyleSheet(mode);

  var toggle = document.querySelector("#theme-switch");
  toggle.checked = (mode == "dark"); // 初始化checkbox
});

function themeSwitch() { // checkbox被点击时切换主题
  var switchValue = document.querySelector("#theme-switch").checked;
  if (switchValue) {
    setStyleSheet("dark");
  } else {
    setStyleSheet("light");
  };
};
