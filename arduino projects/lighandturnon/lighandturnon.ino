// LED يشتغل لما تحكي ويطفي لما تسكت
int soundPin = A0;
int ledPin = 8;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int level = analogRead(soundPin);
  
  if (level > 180) {
    // في صوت = شغّل LED
    digitalWrite(ledPin, HIGH);
    Serial.print("Speaking! ");
    Serial.println(level);
  } else {
    // ساكت = طفّي LED
    digitalWrite(ledPin, LOW);
  }
  
  delay(10);
}
