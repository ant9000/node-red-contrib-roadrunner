DESCRIPTION

Node-RED nodes to control Acmesystem's Roadrunner GPIO.

Further info here: https://www.acmesystems.it/roadrunner_nodered#gpio

INSTALLATION

```
sudo apt install python3-libgpiod
cd ~/.node-red/
npm install node-red-contrib-roadrunner
```

If you are running node-red as a normal user, be sure to give the necessary permissions to /dev/gpio0. One simple way is via the provided udev script, like this:

```
sudo cp tools/60-gpiochip.rules /etc/udev/rules.d/
```

and then rebooting the board.
