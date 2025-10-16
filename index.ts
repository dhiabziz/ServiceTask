require("dotenv").config();
const { Camunda8 } = require("@camunda8/sdk");

// Define the Job type manually
// interface Job<TVariables = any, TCustomHeaders = any, TOutput = any> {
//   variables: TVariables;
//   customHeaders: TCustomHeaders;
//   complete: (output: TOutput) => Promise<void>;
//   fail: (errorMessage: string) => Promise<void>;
//   type: string;
// }

const ZEEBE_ADDRESS = process.env.ZEEBE_ADDRESS;
const ZEEBE_CLIENT_ID = process.env.ZEEBE_CLIENT_ID;
const ZEEBE_CLIENT_SECRET = process.env.ZEEBE_CLIENT_SECRET;
const ZEEBE_AUTHORIZATION_SERVER_URL = process.env.ZEEBE_AUTHORIZATION_SERVER_URL;
const ZEEBE_REST_ADDRESS = process.env.ZEEBE_REST_ADDRESS;
const ZEEBE_GRPC_ADDRESS = process.env.ZEEBE_GRPC_ADDRESS;
const ZEEBE_TOKEN_AUDIENCE = process.env.ZEEBE_TOKEN_AUDIENCE;
const CAMUNDA_TOKEN_AUDIENCE = process.env.CAMUNDA_TOKEN_AUDIENCE;
const CAMUNDA_CLUSTER_ID = process.env.CAMUNDA_CLUSTER_ID;
const CAMUNDA_CLIENT_ID = process.env.CAMUNDA_CLIENT_ID;
const CAMUNDA_CLIENT_SECRET = process.env.CAMUNDA_CLIENT_SECRET;
const CAMUNDA_CLUSTER_REGION = process.env.CAMUNDA_CLUSTER_REGION;
const CAMUNDA_CREDENTIALS_SCOPES = process.env.CAMUNDA_CREDENTIALS_SCOPES;
const CAMUNDA_TASKLIST_BASE_URL = process.env.CAMUNDA_TASKLIST_BASE_URL;
const CAMUNDA_OPERATE_BASE_URL = process.env.CAMUNDA_OPERATE_BASE_URL;
const CAMUNDA_OAUTH_URL = process.env.CAMUNDA_OAUTH_URL;
const CAMUNDA_CLIENT_MODE = process.env.CAMUNDA_CLIENT_MODE;
const CAMUNDA_CLIENT_AUTH_CLIENTID = process.env.CAMUNDA_CLIENT_AUTH_CLIENTID;
const CAMUNDA_CLIENT_AUTH_CLIENTSECRET = process.env.CAMUNDA_CLIENT_AUTH_CLIENTSECRET;
const CAMUNDA_CLIENT_CLOUD_CLUSTERID = process.env.CAMUNDA_CLIENT_CLOUD_CLUSTERID;
const CAMUNDA_CLIENT_CLOUD_REGION = process.env.CAMUNDA_CLIENT_CLOUD_REGION;

const c8 = new Camunda8({
    ZEEBE_ADDRESS,
    ZEEBE_CLIENT_ID,
    ZEEBE_CLIENT_SECRET,
    ZEEBE_AUTHORIZATION_SERVER_URL,
    ZEEBE_REST_ADDRESS,
    ZEEBE_GRPC_ADDRESS,
    ZEEBE_TOKEN_AUDIENCE,
    CAMUNDA_TOKEN_AUDIENCE,
    CAMUNDA_CLUSTER_ID,
    CAMUNDA_CLIENT_ID,
    CAMUNDA_CLIENT_SECRET,
    CAMUNDA_CLUSTER_REGION,
    CAMUNDA_CREDENTIALS_SCOPES,
    CAMUNDA_TASKLIST_BASE_URL,
    CAMUNDA_OPERATE_BASE_URL,
    CAMUNDA_OAUTH_URL,
    CAMUNDA_CLIENT_MODE,
    CAMUNDA_CLIENT_AUTH_CLIENTID,
    CAMUNDA_CLIENT_AUTH_CLIENTSECRET,
    CAMUNDA_CLIENT_CLOUD_CLUSTERID,
    CAMUNDA_CLIENT_CLOUD_REGION
});

const zeebe = c8.getZeebeGrpcApiClient();

console.log("Worker Cuti Siap Menerima Tugas...");

// Database simulasi
const databaseSisaCuti = {
  "k001": 12,
  "k002": 3,
  "k003": 0,
};

const getSisaCutiDariDatabase = async (karyawanId) => {
  console.log(`[DB] Mencari sisa cuti untuk karyawan: ${karyawanId}`);
  await new Promise(resolve => setTimeout(resolve, 200)); 

  const sisaCuti = databaseSisaCuti[karyawanId];
  return sisaCuti !== undefined ? sisaCuti : 0;
};


// Worker untuk cek sisa cuti
zeebe.createWorker({
  taskType: "cek-sisa-kuota", 
  
  taskHandler: async (job) => {
    console.log(`Menerima job '${job.type}'`);

    const { karyawanId } = job.variables;
    
    if (!karyawanId) {
      const errorMessage = "Variabel 'karyawanId' tidak ditemukan dalam job.";
      console.error(`GAGAL: ${errorMessage}`);
      return job.fail(errorMessage);
    }
    console.log(`Variabel diterima: { karyawanId: ${karyawanId} }`);
    
    try {
      const hasilPengecekanDb = await getSisaCutiDariDatabase(karyawanId);
      console.log(`Hasil pengecekan: Sisa cuti ${hasilPengecekanDb} hari.`);

      const variabelUntukProsesSelanjutnya = {
        sisaCuti: hasilPengecekanDb, 
      };
      
      console.log(`Mengirim variabel kembali ke Camunda:`, variabelUntukProsesSelanjutnya);
      
      return job.complete(variabelUntukProsesSelanjutnya);

    } catch (error) {
      const errorMessage = `Terjadi error saat memproses job: ${error.message}`;
      console.error(`GAGAL: ${errorMessage}`);
      return job.fail(errorMessage);
    }
  },
});


// Worker untuk update database HR
zeebe.createWorker({
  taskType: "update-database-hr", 

  taskHandler: async (job) => {
    console.log(`Menerima job '${job.type}' untuk mengurangi cuti.`);

    const { karyawanId, jumlahHari } = job.variables;

    if (!karyawanId || jumlahHari === undefined) {
      const errorMessage = "Variabel 'karyawanId' atau 'jumlahHari' tidak ditemukan.";
      console.error(`GAGAL: ${errorMessage}`);
      return job.fail(errorMessage);
    }
    console.log(`Data diterima: { karyawanId: ${karyawanId}, jumlahHari: ${jumlahHari} }`);

    try {
      const sisaCutiSebelum = databaseSisaCuti[karyawanId];

      if (sisaCutiSebelum === undefined) {
        const errorMessage = `Karyawan dengan ID ${karyawanId} tidak ditemukan di database.`;
        console.error(`GAGAL: ${errorMessage}`);
        return job.fail(errorMessage);
      }
      
      console.log(`Sisa cuti sebelum dikurangi: ${sisaCutiSebelum} hari.`);
      
      databaseSisaCuti[karyawanId] -= jumlahHari;
      
      const sisaCutiTerbaru = databaseSisaCuti[karyawanId];
      console.log(`Sisa cuti terbaru: ${sisaCutiTerbaru} hari.`);

      console.log(`Sukses mengurangi cuti di database.`);
      
      return job.complete({
          sisaCutiTerbaru: sisaCutiTerbaru
      });

    } catch (error) {
      const errorMessage = `Terjadi error saat mengurangi cuti: ${error.message}`;
      console.error(`GAGAL: ${errorMessage}`);
      return job.fail(errorMessage);
    }
  },
});

// Worker untuk kirim notifikasi
zeebe.createWorker({
  taskType: "kirim-notifikasi",

  taskHandler: async (job) => {
    console.log(`Menerima job '${job.type}' untuk mengirim notifikasi.`);

    const { notifikasi } = job.variables;

    if (!notifikasi) {
      const errorMessage = "Variabel 'notifikasi' tidak ditemukan dalam job.";
      console.error(`GAGAL: ${errorMessage}`);
      return job.fail(errorMessage);
    }

    console.log("------------------------------------------");
    console.log(`NOTIFIKASI: "${notifikasi}"`);
    console.log("------------------------------------------");
    
    console.log(`Sukses menampilkan notifikasi.`);
    return job.complete();
  },
});