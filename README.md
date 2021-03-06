
# Getting VCF-Miner started with [Docker](https://www.docker.com/)

**Relevant links:**
 * [VCF-Miner Homepage](http://bioinformaticstools.mayo.edu/research/vcf-miner/) 
 

### VCF-Miner installation using Docker 

In a terminal, clone the repository:
```
git clone https://github.com/Steven-N-Hart/vcf-miner.git
cd vcf-miner
```
Next, build the image
```
docker build -t vcfminer . # Dont forget the '.'!
```
Run the image
``` 
docker run -e NO_LDAP=1 -d  -p 8888:8080 -v $PWD:/home -w /home vcfminer sh ./start.sh
```
Open a browser to http://your-ip:8888/vcf-miner/

```
Username: Admin
Password: temppass
```
**Reminders:** 
 * Doesn’t work on Internet Explorer

############################################################

## Installing on bare metal centos6 or [Docker](https://www.docker.com/)
```
USER=example_user

# Note you may need sudo access to install on bare metal
yum install -y java-1.7.0-openjdk.x86_64 java-1.7.0-openjdk-devel wget tar git
wget -O /home/${USER}/mongodb.tgz https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel62-3.0.3.tgz
tar -zxvf /home/${USER}/mongodb.tgz -C /home/${USER}
cp /home/${USER}/mongodb-linux-x86_64-rhel62-3.0.3/bin/* /bin

mkdir -p /data/db /data/mongo
chmod 775 -R /data/mongo /data/db 

#Get tomcat
wget http://archive.apache.org/dist/tomcat/tomcat-7/v7.0.62/bin/apache-tomcat-7.0.62.tar.gz
tar xvzf apache-tomcat-7.0.62.tar.gz
mv apache-tomcat-7.0.62 /usr/local
chmod 775 /usr/local/apache-tomcat-7.0.62/bin/*sh

#Delpoy VCF MINER war files
git clone https://github.com/Steven-N-Hart/vcf-miner.git
cd vcf-miner
cp *.war /usr/local/apache-tomcat-7.0.62/webapps/


#If you want to not use LDAP (cp securityuserapp-no-ldap.war /usr/local/apache-tomcat-7.0.62/webapps/securityuserapp.war)

echo -e '/usr/local/apache-tomcat-7.0.62/bin/catalina.sh &\nmongod --storageEngine wiredTiger' > start.sh
chmod 775 ./start.sh
./start.sh

```


Now open your browser to `http://server_IP_address:8080/vcf-miner/` (but obviously using your IP address instead)
 * Username: Admin
 * Password: temppass

You are all set!

