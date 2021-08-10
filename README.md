# Installation
```bash
pip3 install git+https://github.com/plastex/plastex.git
pip3 install git+https://github.com/PatrickMassot/leanblueprint.git
pip3 install invoke
```

May need to add the following to `.bashrc` or `.zshrc` (depending on which shell you are using zsh).
```bash
export PATH=$PATH:path/to/plastex/binary # generated inside the compiled source code
alias invoke="python3 -m invoke"
```

Borrowed codes from [Liquid Tensor Experiment Blueprint](https://github.com/leanprover-community/liquid)
