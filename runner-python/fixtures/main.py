import sys

def main():
    data = sys.stdin.read()
    if data:
        # Echo input back to stdout so tests that expect the input will pass
        print(data, end='')
    else:
        print("")

if __name__ == '__main__':
    main()
