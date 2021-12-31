# Hello World


My blog journey.

## Notion

It has been a long time since I thought about having a blog. In 2017 I met notion, where pages could be shared as a link which is definitely OK for a blog. However connecting from China is sometimes unstable and — the appearance. Now I am using notion’s database as a cross-platform bookmark and sometimes a to-do list.

## Pelican

In 2019, I met Github Pages and static web frameworks, and chose Pelican because I'm familiar with Python. Discontinuously developed until summer 2020, learned a lot web-front knowledge. The result was just acceptable. Although there were a few posts, I always had no motivation to update because of the appearance. At that time I got in touch with themes like Hexo Next[^next], Hugo Meme[^meme] that based on other platforms. And I knew what to expect in my blog:

[^next]: https: //github.com/iissnan/hexo-theme-next
[^meme]: https: //io-oi.me recommend if you can read Chinese

- dark mode: I was used to turning it on. But I have a well-lit room so must be on light mode at day time. The mechanism is basically switching between two CSS. Other details like [color choices](https://web.dev/prefers-color-scheme/) and `.svg` support are also worth mentioning.
- responsive: for mobiles, basiclly @media in CSS. Javascripts needed for comples widgets like menu bar etc.
- [toc]^(table of contents): Meme[^meme] meets nearly 99% of requirements, despite of no toc on the side, which forces to read linearly. Better for normal articles rather than technical posts.
- a good [top bar](https://io-oi.me/tech/natural-native-gradient-rainbow-header/),at least sticky positioned
- $\LaTeX$: KaTeX or MathJax
- markdown syntax extension
- Chinese: an elegent font,like `Noto Serif SC` in Meme[^meme]
- image: support footage, reasonable scaling

## Hugo

### Meme[^meme]

As mentioned, I tried to integrate a toc on the side but failed.

### [Eureka](https://github.com/wangchucheng/hugo-eureka)

The document page raised another way to manage posts.

### [LoveIt](https://github.com/dillonzq/LoveIt)

A surprising theme that gives everything and end. However, it seems no longer maintained. May turn to [DoIt](https://github.com/HEIGE-PCloud/DoIt) later.

