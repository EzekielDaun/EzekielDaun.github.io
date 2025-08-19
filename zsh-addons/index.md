# Zsh 配置


# Zsh 配置

修 Mac 抹掉了所有数据。一通重新配置，记录一下终端以及 zsh 相关的内容。

## Homebrew

```bash
brew install zsh zsh-autocomplete zsh-autosuggestions zsh-syntax-highlighting

```

记得去 `.zshrc` 中启用。

## .zshrc

```.zshrc
ZSH_THEME="agnoster"

plugins=(git brew fzf vscode python rust zoxide)
```

