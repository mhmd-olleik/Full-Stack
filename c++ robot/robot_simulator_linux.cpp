#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>

using namespace std;

// ============================================
//   Grid Robot Simulator - C++ Console
//   Version: 1.0 (Linux)
// ============================================

// --- ANSI Color Codes (Linux native support) ---
const string RESET   = "\033[0m";
const string RED     = "\033[91m";
const string GREEN   = "\033[92m";
const string YELLOW  = "\033[93m";
const string BLUE    = "\033[94m";
const string MAGENTA = "\033[95m";
const string CYAN    = "\033[96m";
const string WHITE   = "\033[97m";
const string BOLD    = "\033[1m";
const string DIM     = "\033[2m";

// --- Directions ---
enum Direction { NORTH, EAST, SOUTH, WEST };

string directionName(Direction d) {
    switch (d) {
        case NORTH: return "NORTH  (↑)";
        case EAST:  return "EAST   (→)";
        case SOUTH: return "SOUTH  (↓)";
        case WEST:  return "WEST   (←)";
    }
    return "UNKNOWN";
}

string directionArrow(Direction d) {
    switch (d) {
        case NORTH: return "^";
        case EAST:  return ">";
        case SOUTH: return "v";
        case WEST:  return "<";
    }
    return "?";
}

// --- Cell Types ---
enum CellType { EMPTY, OBSTACLE, TRAIL };

// --- Robot Class ---
class Robot {
public:
    int x, y;
    Direction dir;
    int steps;

    Robot(int startX, int startY, Direction startDir)
        : x(startX), y(startY), dir(startDir), steps(0) {}
};

// --- Grid Class ---
class Grid {
private:
    int rows, cols;
    vector<vector<CellType>> cells;
    Robot robot;

public:
    Grid(int r, int c)
        : rows(r), cols(c), cells(r, vector<CellType>(c, EMPTY)),
          robot(0, 0, EAST) {}

    // --- Display the grid ---
    void display() {
        cout << "\n";

        // Top border
        cout << CYAN << "  ┌";
        for (int j = 0; j < cols; j++) cout << "───";
        cout << "─┐" << RESET << "\n";

        for (int i = 0; i < rows; i++) {
            cout << CYAN << "  │ " << RESET;
            for (int j = 0; j < cols; j++) {
                if (robot.x == i && robot.y == j) {
                    cout << BOLD << GREEN << " " << directionArrow(robot.dir) << " " << RESET;
                } else if (cells[i][j] == OBSTACLE) {
                    cout << RED << " ■ " << RESET;
                } else if (cells[i][j] == TRAIL) {
                    cout << DIM << BLUE << " · " << RESET;
                } else {
                    cout << DIM << " . " << RESET;
                }
            }
            cout << CYAN << "│" << RESET << "\n";
        }

        // Bottom border
        cout << CYAN << "  └";
        for (int j = 0; j < cols; j++) cout << "───";
        cout << "─┘" << RESET << "\n";

        // Robot status info
        cout << "\n";
        cout << YELLOW << "  Position:  " << RESET << "(" << robot.x << ", " << robot.y << ")\n";
        cout << YELLOW << "  Direction: " << RESET << directionName(robot.dir) << "\n";
        cout << YELLOW << "  Steps:     " << RESET << robot.steps << "\n";
        cout << "\n";
    }

    // --- Move forward ---
    bool moveForward() {
        int newX = robot.x, newY = robot.y;
        switch (robot.dir) {
            case NORTH: newX--; break;
            case SOUTH: newX++; break;
            case EAST:  newY++; break;
            case WEST:  newY--; break;
        }

        if (newX < 0 || newX >= rows || newY < 0 || newY >= cols) {
            cout << RED << "\n  [!] Cannot move: boundary reached.\n" << RESET;
            return false;
        }
        if (cells[newX][newY] == OBSTACLE) {
            cout << RED << "\n  [!] Cannot move: obstacle detected.\n" << RESET;
            return false;
        }

        cells[robot.x][robot.y] = TRAIL;
        robot.x = newX;
        robot.y = newY;
        robot.steps++;
        cout << GREEN << "\n  [OK] Moved forward.\n" << RESET;
        return true;
    }

    // --- Move backward ---
    bool moveBackward() {
        int newX = robot.x, newY = robot.y;
        switch (robot.dir) {
            case NORTH: newX++; break;
            case SOUTH: newX--; break;
            case EAST:  newY--; break;
            case WEST:  newY++; break;
        }

        if (newX < 0 || newX >= rows || newY < 0 || newY >= cols) {
            cout << RED << "\n  [!] Cannot move: boundary reached.\n" << RESET;
            return false;
        }
        if (cells[newX][newY] == OBSTACLE) {
            cout << RED << "\n  [!] Cannot move: obstacle detected.\n" << RESET;
            return false;
        }

        cells[robot.x][robot.y] = TRAIL;
        robot.x = newX;
        robot.y = newY;
        robot.steps++;
        cout << GREEN << "\n  [OK] Moved backward.\n" << RESET;
        return true;
    }

    // --- Turn left ---
    void turnLeft() {
        switch (robot.dir) {
            case NORTH: robot.dir = WEST;  break;
            case WEST:  robot.dir = SOUTH; break;
            case SOUTH: robot.dir = EAST;  break;
            case EAST:  robot.dir = NORTH; break;
        }
        cout << MAGENTA << "\n  [OK] Turned left. Now facing " << directionName(robot.dir) << "\n" << RESET;
    }

    // --- Turn right ---
    void turnRight() {
        switch (robot.dir) {
            case NORTH: robot.dir = EAST;  break;
            case EAST:  robot.dir = SOUTH; break;
            case SOUTH: robot.dir = WEST;  break;
            case WEST:  robot.dir = NORTH; break;
        }
        cout << MAGENTA << "\n  [OK] Turned right. Now facing " << directionName(robot.dir) << "\n" << RESET;
    }

    // --- Place obstacle ---
    void placeObstacle() {
        int r, c;
        cout << YELLOW << "\n  Enter obstacle row (0-" << rows - 1 << "): " << RESET;
        cin >> r;
        cout << YELLOW << "  Enter obstacle col (0-" << cols - 1 << "): " << RESET;
        cin >> c;

        if (r < 0 || r >= rows || c < 0 || c >= cols) {
            cout << RED << "\n  [!] Invalid position.\n" << RESET;
            return;
        }
        if (r == robot.x && c == robot.y) {
            cout << RED << "\n  [!] Cannot place obstacle on robot position.\n" << RESET;
            return;
        }

        cells[r][c] = OBSTACLE;
        cout << GREEN << "\n  [OK] Obstacle placed at (" << r << ", " << c << ").\n" << RESET;
    }

    // --- Reset grid ---
    void reset() {
        for (int i = 0; i < rows; i++)
            for (int j = 0; j < cols; j++)
                cells[i][j] = EMPTY;
        robot.x = 0;
        robot.y = 0;
        robot.dir = EAST;
        robot.steps = 0;
        cout << GREEN << "\n  [OK] Grid reset. Robot returned to origin.\n" << RESET;
    }

    // --- Auto patrol (move in a square pattern) ---
    void autoPatrol(int size) {
        cout << CYAN << "\n  [INFO] Auto patrol starting...\n" << RESET;
        for (int side = 0; side < 4; side++) {
            for (int step = 0; step < size; step++) {
                if (!moveForward()) {
                    cout << RED << "  [!] Patrol interrupted: obstacle or boundary.\n" << RESET;
                    return;
                }
            }
            turnRight();
        }
        cout << GREEN << "  [OK] Patrol completed successfully.\n" << RESET;
    }
};

// --- Show menu ---
void showMenu() {
    cout << BOLD << CYAN << "  ╔═══════════════════════════════════╗\n";
    cout << "  ║       ROBOT CONTROL PANEL         ║\n";
    cout << "  ╠═══════════════════════════════════╣\n" << RESET;
    cout << CYAN;
    cout << "  ║                                   ║\n";
    cout << "  ║" << WHITE << "   [W] Move Forward               " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [S] Move Backward              " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [A] Turn Left                  " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [D] Turn Right                 " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [O] Place Obstacle             " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [P] Auto Patrol                " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [R] Reset Grid                 " << CYAN << "║\n";
    cout << "  ║" << WHITE << "   [Q] Quit                       " << CYAN << "║\n";
    cout << "  ║                                   ║\n";
    cout << "  ╚═══════════════════════════════════╝\n" << RESET;
    cout << "\n" << YELLOW << "  Enter command: " << RESET;
}

// --- Welcome banner ---
void showBanner() {
    cout << "\n";
    cout << BOLD << GREEN;
    cout << "  ██████╗  ██████╗ ██████╗  ██████╗ ████████╗\n";
    cout << "  ██╔══██╗██╔═══██╗██╔══██╗██╔═══██╗╚══██╔══╝\n";
    cout << "  ██████╔╝██║   ██║██████╔╝██║   ██║   ██║   \n";
    cout << "  ██╔══██╗██║   ██║██╔══██╗██║   ██║   ██║   \n";
    cout << "  ██║  ██║╚██████╔╝██████╔╝╚██████╔╝   ██║   \n";
    cout << "  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝    ╚═╝   \n";
    cout << RESET;
    cout << CYAN << "\n  ═══════════════════════════════════════\n";
    cout << BOLD << WHITE << "    Grid Robot Simulator v1.0 (Linux)\n";
    cout << DIM << "    2D Grid-Based Robot Control System\n";
    cout << CYAN << "  ═══════════════════════════════════════\n\n" << RESET;
}

// ============================================
//              Main Entry Point
// ============================================
int main() {
    int gridSize;
    showBanner();

    cout << YELLOW << "  Enter grid size (5-20): " << RESET;
    cin >> gridSize;

    if (gridSize < 5) gridSize = 5;
    if (gridSize > 20) gridSize = 20;

    Grid grid(gridSize, gridSize);

    cout << GREEN << "\n  [OK] Grid initialized. Size: " << gridSize << "x" << gridSize << "\n" << RESET;

    char command;
    bool running = true;

    while (running) {
        grid.display();
        showMenu();
        cin >> command;

        switch (tolower(command)) {
            case 'w': grid.moveForward();   break;
            case 's': grid.moveBackward();  break;
            case 'a': grid.turnLeft();      break;
            case 'd': grid.turnRight();     break;
            case 'o': grid.placeObstacle(); break;
            case 'p': {
                int patrolSize;
                cout << YELLOW << "  Enter patrol size (1-" << gridSize / 2 << "): " << RESET;
                cin >> patrolSize;
                grid.autoPatrol(patrolSize);
                break;
            }
            case 'r': grid.reset(); break;
            case 'q':
                cout << BOLD << MAGENTA << "\n  Program terminated. Goodbye.\n\n" << RESET;
                running = false;
                break;
            default:
                cout << RED << "\n  [!] Unknown command. Please try again.\n" << RESET;
                break;
        }
    }

    return 0;
}
