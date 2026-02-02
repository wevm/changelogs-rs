#!/bin/sh
set -e

BANNER='
         ,,                                               ,,
       `7MM                                             `7MM
         MM                                               MM
 ,p6"bo  MMpMMMb.   ,6"Yb.  `7MMpMMMb.  .P"Ybmmm .gP"Ya   MM  ,pW"Wq.
6M'"'"'  OO  MM    MM  8)   MM    MM    MM :MI  I8  ,M'"'"'   Yb  MM 6W'"'"'   `Wb
8M       MM    MM   ,pm9MM    MM    MM  WmmmP"  8M""""""  MM 8M     M8
YM.    , MM    MM  8M   MM    MM    MM 8M       YM.    ,  MM YA.   ,A9
 YMbmd'"'"'.JMML  JMML.`Moo9^Yo..JMML  JMML.YMMMMMb  `Mbmmd'"'"'.JMML.`Ybmd9'"'"'
                                       6'"'"'     dP
                                       Ybmmmd'"'"'
'

echo "$BANNER"

REPO="wevm/changelogs-rs"
BINARY="changelogs"
VERSION="${1:-latest}"

detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux";;
        Darwin*) echo "darwin";;
        *)       echo "unsupported"; exit 1;;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64)  echo "amd64";;
        amd64)   echo "amd64";;
        arm64)   echo "arm64";;
        aarch64) echo "arm64";;
        *)       echo "unsupported"; exit 1;;
    esac
}

OS=$(detect_os)
ARCH=$(detect_arch)
ASSET="${BINARY}-${OS}-${ARCH}"

echo "Detected: ${OS}/${ARCH}"
echo "Installing changelogs ${VERSION}..."

if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/${REPO}/releases/download/latest/${ASSET}"
else
    URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"
fi

INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Downloading from ${URL}..."
curl -fsSL "$URL" -o "${INSTALL_DIR}/${BINARY}"
chmod +x "${INSTALL_DIR}/${BINARY}"

echo ""
echo "Installed ${BINARY} to ${INSTALL_DIR}/${BINARY}"

if ! echo "$PATH" | grep -q "${INSTALL_DIR}"; then
    echo ""
    echo "Add ${INSTALL_DIR} to your PATH:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi
