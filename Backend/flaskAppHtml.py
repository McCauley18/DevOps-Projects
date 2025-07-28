from flask import Flask, render_template

 
app =  Flask(__name__, template_folder='templates')

 
@app.route('/')
def greetings(): 
    myName = 'McCauley' 
    mathz = 40
    ageis = 43
    return render_template('index.html', myName=myName, mathz=mathz, ageis=ageis)
    #return "First Flask Application"

if __name__ == '__main__': 
    app.run(debug=True)  



# have to run the "python flaskAppHtml.py" command 
# then go to the "http://127.0.0.1:5000" 