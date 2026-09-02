# Source this file before project commands so the active shell can switch Node.
# If no supported version manager is installed, keep the caller's current Node.
if command -v fnm >/dev/null 2>&1; then
  fnm use
elif command -v nvm >/dev/null 2>&1; then
  nvm use
else
  aigpu_nvm_script=""

  if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    aigpu_nvm_script="$NVM_DIR/nvm.sh"
  elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    aigpu_nvm_script="$HOME/.nvm/nvm.sh"
  elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    aigpu_nvm_script="/opt/homebrew/opt/nvm/nvm.sh"
  elif [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
    aigpu_nvm_script="/usr/local/opt/nvm/nvm.sh"
  fi

  if [ -n "$aigpu_nvm_script" ]; then
    . "$aigpu_nvm_script"
    nvm use
  fi

  unset aigpu_nvm_script
fi
