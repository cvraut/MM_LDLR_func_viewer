# python notes

setup via pipenv in powershell:

- once per machine:

```powershell
py -m pip install --user pipenv
```

- once per project

```powershell
cd py_data_manip
$env:PIPENV_VENV_IN_PROJECT = "1"    # put the venv in py_data_manip\.venv (easier to find and delete)
py -m pipenv install --dev           
py -m pipenv run jupyter lab
```