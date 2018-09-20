#!/bin/sh

sudo apt-get install -y libtool pkg-config autoconf-archive python3-dev
wget https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/snapshot/libgpiod-1.1.1.tar.gz
tar xvf libgpiod-1.1.1.tar.gz
cd libgpiod-1.1.1

export PYTHON_VERSION=3
./autogen.sh \
   --enable-tools=yes       \
   --enable-bindings-python \
   --prefix=/usr/local

make
sudo make install
sudo ldconfig
