from flask import Flask, request

app = Flask(__name__)
 
@app.route("/Hello")
def greetings():
    return {"Hello World", "Happy Birthday", "Today is a good today"}        

@app.route("/name")
def getName():
    return "<h1>Using HTML</h1>"


@app.route('/greet/<name>') #dynmaic routing a.k.a URL Processor
def greetName(name):
    return f"Hello {name}"


#cmd => -I to get the status code 

@app.route("/adding/<int:num1>/<int:num2>")
def addingNum(add1, add2):
    return f"Sum = {add1} + {add2} = {add1 + add2}"




if __name__ == "__main__":
    app.run(debug=True)  # swap to false when we deploy


#Flask Backend Python learn