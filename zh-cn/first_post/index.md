# Hello World


# 博客历程

## Notion

搞一个博客的想法由来已久，2017 年接触到 notion，文章可以开启外链，当博客用完全没问题。然而国内访问不稳定，以及——不好看，于是迟迟没有动手。目前主要把 notion 的 database 作为跨平台收藏夹、偶尔写一些较重的 todo list 便于跨平台访问。

## Pelican

2019 年大一期间找点事做，接触到 Github Pages 与静态博客工具，因为相对熟悉 Python 选择了 Pelican。断断续续开发到 2020 年暑假结束，接触了很多前端知识。最后的效果差强人意，虽然确实部署了一两篇文章，但总因为外观不舒心而没有动力更新。在此期间了解了 Hexo Next[^next], Hugo Meme[^meme]等等基于其他博客平台的主题，确定了自己期望的几个主要功能：

- dark mode：以前常驻深色模式，但宿舍采光很好，导致白天只能调高亮度用白色模式，夜晚只能调低亮度用深色模式，否则眼睛难受。我的博客自然也应具备这个功能。实现上就是用 js 做两套 css 的切换。具体到深色模式的[配色设计]()，又有很多细节，以及 svg 的适配等等，也是个小坑。
- responsive：适配移动端，本质上是 css 的 media 属性。折叠菜单等又需要 js 配合。
- toc：Meme[^meme]可以说满足 99% 的需求，除了没有侧边目录，导致只能线性阅读。更适合杂文而非技术类博客。
- 一个好看的[顶栏](https://io-oi.me/tech/natural-native-gradient-rainbow-header/)，起码 sticky 定位
- $\LaTeX$：KaTeX 或 MathJax
- markdown 扩展语法
- 中文：一个好看的中文字体，Meme[^meme]所用的[思源宋体]^(Noto Serif SC)真是太棒了
- 图片：支持图片下方标注，合理的缩放

## Hugo

### Meme[^meme]

如同上文所述，尝试拼一个侧边目录进去，技术力不够调不好看，作罢。

### [Eureka](https://github.com/wangchucheng/hugo-eureka)

换到 Hugo 之后并没有像 Pelican 一样深入了解。这个主题的 doc 模式启发了另一种组织文章的方式。

### [LoveIt](https://github.com/dillonzq/LoveIt)

相当惊艳的主题，功能丰富，完成度高。看到之后别无所求了。然而似乎没有再更新了，有意向转向 [DoIt](https://github.com/HEIGE-PCloud/DoIt)，不过先把 LoveIt 折腾明白吧。

[^next]: https://github.com/iissnan/hexo-theme-next
[^meme]: https://io-oi.me 文章也很有意思

