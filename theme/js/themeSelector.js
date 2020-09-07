const themes = {
  "dark": "theme/css/dark.css",
  "light": "theme/css/bootstrap.min.css",
};
const icon ={
  "dark":"theme/images/dark.svg",
  "light":"theme/images/light.svg",
};

function setStyleSheet(title) {
  // 找到head
  var doc_head = document.head;
  // 找到所有的link标签
  var link_list = document.getElementsByTagName("link");
  if (link_list) {
    for (var i = 0; i < link_list.length; i++) {
      // 找到我们需要替换的link，
      // 一般情况下有些样式是公共样式，我们可以写到功能样式文件中，不用来做替换；
      // 这样可以避免每次替换的时候样式文件都很大；可以节省加载速度；
      if (link_list[i].getAttribute("id") === "theme") {
        // 找到后将这个link标签从head中移除
        doc_head.removeChild(link_list[i]);
      }
    }
  }
  // 创建一个新link标签
  var link_style = document.createElement("link");
  // 对link标签中的属性赋值
  link_style.setAttribute("rel", "stylesheet");
  link_style.setAttribute("type", "text/css");
  link_style.setAttribute("href", themes[title]);
  link_style.setAttribute("id", "theme");
  // 加载到head中最后的位置
  doc_head.appendChild(link_style);

  // 记录到localStorage
  localStorage.setItem("theme", title);
};

function loaded() { // body加载完成时启用主题
  const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
  var isDefaultDark = mediaQueryList.matches;
  var lastChoice = localStorage.getItem("theme");
  var mode;

  if (lastChoice != null) { // 上次选择优先
    mode = lastChoice;
  } else {
    if (isDefaultDark) { // 若浏览器偏好为dark
      mode = "dark";
    } else { // 浏览器为light或未设定
      mode = "light";
    };
  };
  setStyleSheet(mode);

  var toggle = document.querySelector("#theme-switch");
  toggle.checked = (mode == "dark"); // 初始化checkbox
};

function theme_switch() { // checkbox被点击时切换主题
  var switchValue = document.querySelector("#theme-switch").checked;
  if (switchValue) {
    setStyleSheet("dark");
  } else {
    setStyleSheet("light");
  }
}