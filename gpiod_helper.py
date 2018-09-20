#! /usr/bin/python3

import sys, time, threading
sys.path.append("/usr/local/lib/python3.5/site-packages/")
import gpiod

class GPIO:
    def __init__(self):
        self.chip = gpiod.Chip('/dev/gpiochip0', gpiod.Chip.OPEN_BY_PATH)

    def get_line(self, pin):
        try:
            pin_num = int(pin)
            pin_line = self.chip.get_line(pin_num)
        except ValueError:
            pin_line = self.chip.find_line(pin)
        return pin_line

    def monitor(self, pin):
        pin_line = self.get_line(pin)
        pin_line.request(consumer="IN%s" % pin_line.name(), type=gpiod.LINE_REQ_EV_BOTH_EDGES)

        running = True
        pin_state = pin_line.get_value()
        print(pin_state)

        def wait_for_edge(line):
            nonlocal running, pin_state
            while running:
                while line.event_wait(nsec=500*1000):
                    event = line.event_read()
                    if event.type in [ gpiod.LineEvent.RISING_EDGE, gpiod.LineEvent.FALLING_EDGE ]:
                        state = line.get_value()
                        if state != pin_state:
                            pin_state = state
                            print(pin_state)

        thread = threading.Thread(target=wait_for_edge, args=[pin_line])
        thread.start()

        while running:
            try:
                data = input()
                if 'q' in data:
                    running = False
            except (EOFError, SystemExit):
                running = False

        if thread.isAlive():
            thread.join()

    def out(self, pin, initial_value=None):
        pin_line = self.get_line(pin)
        pin_line.request(consumer="OUT%s" % pin_line.name(), type=gpiod.LINE_REQ_DIR_OUT)

        def set_value(data):
            try:
                value = int(data)
                if value != 0:
                    value = 1
                pin_line.set_value(value)
            except ValueError:
                pass

        if initial_value is not None:
            set_value(initial_value)

        running = True
        while running:
            try:
                data = input()
                if 'q' in data:
                    running = False
                else:
                    set_value(data)
            except (EOFError, SystemExit):
                running = False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
"""Usage:

    {me} in pin
       monitor pin line, print value on changes

    {me} out [initial value]
       set line as output; accepts values from stdin (one per line)

    To end the helper: type q, enter

""".format(me=sys.argv[0])
        )
        sys.exit(1)

    cmd = sys.argv[1]
    pin = sys.argv[2]

    gpio = GPIO()

    if cmd == "in":
        gpio.monitor(pin)
    elif cmd == "out":
        initial_value = None
        if len(sys.argv) > 3:
            initial_value = sys.argv[3]
        gpio.out(pin, initial_value)

    sys.exit(0)
