// مشروع زر ضغط + LED
int ledPin = 8;      // LED
int buttonPin = 7;   // زر الضغط

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT);
}

void loop() {
  int buttonState = digitalRead(buttonPin);
  
  if (buttonState == HIGH) {
    // الزر مضغوط = شغّل LED
    digitalWrite(ledPin, HIGH);
  } else {
    // الزر مو مضغوط = طفّي LED
    digitalWrite(ledPin, LOW);
  }
}
