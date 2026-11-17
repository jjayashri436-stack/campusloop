import os
import sys

if __name__ == '__main__':
    from app import app
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 CampusLoop is running live at: http://localhost:{port}")
    app.run(host='127.0.0.1', port=port, debug=False)
