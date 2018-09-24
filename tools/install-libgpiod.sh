#!/bin/sh

apt-get install -y libtool pkg-config autoconf-archive python3-dev checkinstall
wget https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/snapshot/libgpiod-1.1.1.tar.gz
tar xvf libgpiod-1.1.1.tar.gz
cd libgpiod-1.1.1

export PYTHON_VERSION=3
./autogen.sh \
   --enable-tools=yes       \
   --enable-bindings-python \
   --prefix=/usr/local
make
echo 'C library and tools for interacting with the linux GPIO character device' > description-pak
checkinstall -y \
  --pkgsource='https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/' \
  --pkggroup=libs \
  --nodoc \
  make install
dpkg -i libgpiod_1.1.1-1_armhf.deb
