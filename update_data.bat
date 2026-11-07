@echo off
REM Pull the latest NYC Marshal / Sheriff auction lists on your own PC and publish them to the site.
REM Needs Python 3.11 and Git. Double-click to run from the repo folder.
cd /d "%~dp0"
python -m pip install --quiet requests pypdf
python scripts\fetch_nyc_auctions.py || goto :err
git add data\nyc_marshal.json
git commit -m "Update NYC auction data" && git push
echo.
echo Done - the site updates in a minute or two.
pause
exit /b 0
:err
echo Fetch failed - see the message above.
pause
exit /b 1
