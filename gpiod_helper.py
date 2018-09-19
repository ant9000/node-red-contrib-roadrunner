#! /usr/bin/python3

import sys, time, threading
sys.path.append("/usr/local/lib/python3.5/site-packages/")
import gpiod

#pin_name = "PB31"
pin_num = 63

chip = gpiod.Chip('/dev/gpiochip0', gpiod.Chip.OPEN_BY_PATH)
#pin_line = chip.find_line(pin_name)
pin_line = chip.get_line(pin_num)
pin_line.request(consumer=sys.argv[0], type=gpiod.LINE_REQ_EV_BOTH_EDGES)

running = True
pin_state = pin_line.get_value()

def wait_for_edge(line):
    global running, pin_state
    print("Thread start")
    while running:
        while pin_line.event_wait(nsec=500*1000):
            event = pin_line.event_read()
            if event.type in [ gpiod.LineEvent.RISING_EDGE, gpiod.LineEvent.FALLING_EDGE ]:
                state = pin_line.get_value()
                if state != pin_state:
                    pin_state = state
                    tstamp = time.strftime('%m/%d/%Y %H:%M:%S', time.localtime(event.sec))
                    print("[%s] %s: %s" % (tstamp, event.type, pin_state))
            else:
                raise TypeError('Invalid event type')
    print("Thread exit")

thread = threading.Thread(target=wait_for_edge, args=[pin_line])
thread.start()

while running:
    try:
        data = input()
        if 'close' in data:
            running = False
    except (EOFError, SystemExit):
        running = False

if thread.isAlive():
    print("Waiting for thread to exit")
    thread.join()
sys.exit(0)
